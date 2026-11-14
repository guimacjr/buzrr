import type { MediaStorage } from "./media-storage";

/** Rebase legacy development uploads without changing persisted asset identities. */
export function publicLocalUrl(
  url: string,
  driver: MediaStorage["driver"],
): string {
  const publicUrl = process.env.STORAGE_PUBLIC_URL?.replace(/\/+$/, "");
  if (driver !== "local" || !publicUrl) return url;
  const match = url.match(
    /^http:\/\/(?:localhost|127\.0\.0\.1):3001\/uploads\/([\w-]+\.\w+)$/,
  );
  return match ? `${publicUrl}/${match[1]}` : url;
}
