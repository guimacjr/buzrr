import { UnsupportedMediaError } from "./media-storage";

/** Only call with a driver-validated URL; redirects must never escape that boundary. */
export async function readRemoteMedia(
  url: string,
  maxBytes: number,
): Promise<Buffer> {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok || !response.body)
    throw new Error("Não foi possível baixar a mídia armazenada.");
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    if (Number(response.headers.get("content-length")) > maxBytes)
      throw new UnsupportedMediaError("Mídia excede 50 MB.");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes)
        throw new UnsupportedMediaError("Mídia excede 50 MB.");
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
