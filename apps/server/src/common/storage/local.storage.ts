import { mkdir, unlink, writeFile, open } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { nanoid } from "nanoid";
import { sniffMedia } from "./image-sniff";
import {
  MediaStorage,
  type StoredMedia,
  type UploadMeta,
} from "./media-storage";

/** URL path the API serves local uploads under (see main.ts). */
export const LOCAL_UPLOADS_ROUTE = "/uploads";

/**
 * Uploads on the API server's own disk, served back by the API at
 * `/uploads/*`. Needs nothing external — the "runs offline on a school
 * server" option. Use a persistent volume: on an ephemeral container disk
 * every image disappears on redeploy.
 */
export class LocalStorage extends MediaStorage {
  readonly driver = "local" as const;
  readonly dir: string;
  private readonly publicUrl: string;

  constructor(config: { dir: string; publicUrl: string }) {
    super();
    this.dir = resolve(config.dir);
    this.publicUrl = config.publicUrl.replace(/\/+$/, "");
  }

  async upload(buffer: Buffer, _meta?: UploadMeta): Promise<StoredMedia> {
    const { ext, mediaType } = sniffMedia(buffer);
    const key = `${nanoid(21)}.${ext}`;
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, key), buffer, { flag: "wx" });
    return { url: `${this.publicUrl}/${key}`, mediaType };
  }

  async read(url: string, maxBytes: number): Promise<Buffer> {
    const base = `${this.publicUrl}/`;
    const legacy = url.match(
      /^http:\/\/(?:localhost|127\.0\.0\.1):3001\/uploads\/([\w-]+\.\w+)$/,
    )?.[1];
    const relative = url.startsWith(base)
      ? url.slice(base.length)
      : url.startsWith("/uploads/")
        ? url.slice("/uploads/".length)
        : legacy;
    if (!relative || !/^[\w-]+\.\w+$/.test(relative))
      return super.read(url, maxBytes);
    const handle = await open(join(this.dir, relative), "r");
    try {
      if ((await handle.stat()).size > maxBytes)
        throw new Error("Mídia excede 50 MB.");
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of handle.createReadStream()) {
        size += chunk.length;
        if (size > maxBytes) throw new Error("Mídia excede 50 MB.");
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } finally {
      await handle.close();
    }
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith(`${this.publicUrl}/`)) return;
    // basename() keeps a crafted URL from reaching outside the upload dir.
    const key = basename(url.slice(this.publicUrl.length + 1));
    if (!/^[\w-]+\.\w+$/.test(key)) return;
    await unlink(join(this.dir, key)).catch(() => undefined);
  }
}
