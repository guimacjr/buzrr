import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Unzip, UnzipInflate, zipSync, type Zippable } from "fflate";
import {
  PACKAGE_MAX_BYTES,
  PACKAGE_MEDIA_MAX_BYTES,
  packageManifestSchema,
  type PackageManifest,
} from "@buzrr/contract";

const MAX_EXPANDED = 200 * 1024 * 1024;
const MAX_JSON = 2 * 1024 * 1024;
export const digest = (data: Buffer) =>
  createHash("sha256").update(data).digest("hex");

/** Streaming inflation bounds actual output, including archives with forged size headers. */
export function readArchive(buffer: Buffer) {
  if (!buffer.length || buffer.length > PACKAGE_MAX_BYTES)
    throw new BadRequestException("Escolha um ZIP de até 100 MB.");
  const files = new Map<string, Buffer>();
  const names = new Set<string>();
  let expanded = 0;
  let pending = 0;
  try {
    const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (
      end < 0 ||
      end + 22 > buffer.length ||
      end + 22 + buffer.readUInt16LE(end + 20) !== buffer.length ||
      buffer.readUInt16LE(end + 4) !== 0 ||
      buffer.readUInt16LE(end + 6) !== 0 ||
      buffer.readUInt32LE(end + 12) + buffer.readUInt32LE(end + 16) !== end
    )
      throw new Error("ZIP incompleto ou formato não suportado.");
    const entryCount = buffer.readUInt16LE(end + 10);
    if (entryCount > 1003 || buffer.readUInt16LE(end + 8) !== entryCount)
      throw new Error("Quantidade de arquivos inválida.");
    const unzip = new Unzip((file) => {
      if (
        names.has(file.name) ||
        names.size >= 1003 ||
        !/^(manifest\.json|quiz\.json|appearance\.json|media\/[a-f0-9]{64}\.(png|jpg|gif|webp|avif|mp4|webm))$/.test(
          file.name,
        )
      )
        throw new Error("Arquivo duplicado ou caminho inválido no ZIP.");
      names.add(file.name);
      pending++;
      const limit = file.name.endsWith(".json")
        ? MAX_JSON
        : PACKAGE_MEDIA_MAX_BYTES;
      if ((file.originalSize ?? 0) > limit)
        throw new Error("Arquivo excede o limite permitido.");
      let size = 0;
      const chunks: Buffer[] = [];
      file.ondata = (error, chunk, final) => {
        if (error) throw error;
        size += chunk.length;
        expanded += chunk.length;
        if (size > limit || expanded > MAX_EXPANDED)
          throw new Error("Conteúdo descompactado excede o limite permitido.");
        chunks.push(Buffer.from(chunk));
        if (final) {
          files.set(file.name, Buffer.concat(chunks));
          pending--;
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    // Small compressed chunks bound each inflater allocation before the output check.
    for (let offset = 0; offset < buffer.length; offset += 1024)
      unzip.push(
        buffer.subarray(offset, offset + 1024),
        offset + 1024 >= buffer.length,
      );
    if (pending || files.size !== entryCount || !files.has("manifest.json"))
      throw new Error("ZIP incompleto.");
    const manifest = packageManifestSchema.parse(
      JSON.parse(files.get("manifest.json")!.toString("utf8")),
    );
    const payloadName = `${manifest.kind}.json`;
    if (!files.has(payloadName)) throw new Error("Conteúdo do pacote ausente.");
    const expected = new Set(["manifest.json", payloadName]);
    for (const media of manifest.media) {
      if (expected.has(media.path)) throw new Error("Mídia duplicada.");
      expected.add(media.path);
      const bytes = files.get(media.path);
      if (
        !bytes ||
        bytes.length !== media.bytes ||
        digest(bytes) !== media.sha256
      )
        throw new Error("Mídia ausente ou corrompida.");
    }
    if (expected.size !== files.size)
      throw new Error("Arquivos não declarados no pacote.");
    const payload: unknown = JSON.parse(
      files.get(payloadName)!.toString("utf8"),
    );
    return { manifest, payload, files };
  } catch (error) {
    throw new BadRequestException(
      `Pacote inválido ou incompatível. ${error instanceof Error && error.name !== "ZodError" ? error.message : "Verifique a versão e o conteúdo."}`,
    );
  }
}

export function writeArchive(
  kind: PackageManifest["kind"],
  payload: unknown,
  media: Map<string, Buffer>,
) {
  const manifest: PackageManifest = {
    format: "buzrr",
    version: 1,
    kind,
    media: [...media].map(([path, bytes]) => ({
      path,
      bytes: bytes.length,
      sha256: digest(bytes),
    })),
  };
  const json = Buffer.from(JSON.stringify(payload));
  if (json.length > MAX_JSON)
    throw new BadRequestException("Conteúdo do pacote excede 2 MB.");
  const entries: Zippable = {
    "manifest.json": Buffer.from(JSON.stringify(manifest)),
    [`${kind}.json`]: json,
  };
  for (const [path, bytes] of media) entries[path] = [bytes, { level: 0 }];
  const zipped = Buffer.from(zipSync(entries, { level: 6 }));
  if (zipped.length > PACKAGE_MAX_BYTES)
    throw new BadRequestException("Pacote excede 100 MB. Reduza as mídias.");
  return zipped;
}
