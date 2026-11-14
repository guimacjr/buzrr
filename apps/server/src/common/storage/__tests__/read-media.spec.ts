import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "../local.storage";
import { S3Storage } from "../s3.storage";
import { CloudinaryStorage } from "../cloudinary.storage";
import { readRemoteMedia } from "../read-media";

const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
let dir: string | undefined;
afterEach(async () => {
  vi.unstubAllGlobals();
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("portable media reads", () => {
  it("reads local uploads offline, including legacy and relative URLs, with size limits", async () => {
    dir = await mkdtemp(join(tmpdir(), "buzrr-package-"));
    const storage = new LocalStorage({
      dir,
      publicUrl: "https://quiz.example/uploads",
    });
    const { url } = await storage.upload(png);
    const filename = url.split("/").pop();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const source of [
      url,
      `/uploads/${filename}`,
      `http://localhost:3001/uploads/${filename}`,
    ])
      expect(await storage.read(source, 100)).toEqual(png);
    expect(fetch).not.toHaveBeenCalled();
    await expect(storage.read(url, 1)).rejects.toThrow("excede");
    for (const source of [
      "https://evil.test/a.png",
      "https://quiz.example/uploads/../../etc/passwd",
      "/uploads/%2e%2e%2fsecret.png",
    ])
      await expect(storage.read(source, 100)).rejects.toThrow(
        "armazenamento configurado",
      );
  });
  it("only fetches S3 objects under the configured public URL and prefix", async () => {
    const storage = new S3Storage({
      endpoint: "http://store:9000",
      region: "local",
      bucket: "quiz",
      accessKeyId: "test",
      secretAccessKey: "test",
      forcePathStyle: true,
      publicUrl: "http://store:9000/quiz",
      prefix: "buzrr.test/",
    });
    const fetch = vi.fn().mockImplementation(async () => new Response(png));
    vi.stubGlobal("fetch", fetch);
    expect(
      await storage.read("http://store:9000/quiz/buzrr.test/test.png", 100),
    ).toEqual(png);
    for (const url of [
      "http://169.254.169.254/meta",
      "http://store:9000/quiz/other/test.png",
      "http://store:9000/quiz/buzrr.test/../secret.png",
      "http://store:9000/quiz/buzrr.test/%2e%2e/secret.png",
    ])
      await expect(storage.read(url, 100)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![1]).toMatchObject({ redirect: "error" });
  });
  it("only fetches Cloudinary upload URLs in this installation's cloud", async () => {
    const storage = new CloudinaryStorage({ cloudName: "demo" });
    const fetch = vi.fn().mockImplementation(async () => new Response(png));
    vi.stubGlobal("fetch", fetch);
    expect(
      await storage.read(
        "https://res.cloudinary.com/demo/image/upload/v1/test.png",
        100,
      ),
    ).toEqual(png);
    for (const url of [
      "http://127.0.0.1/test",
      "https://res.cloudinary.com/other/image/upload/test.png",
      "https://res.cloudinary.com/demo/image/fetch/http://127.0.0.1/secret",
    ])
      await expect(storage.read(url, 100)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("bounds streamed remote data even without Content-Length", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response(png)),
    );
    await expect(
      readRemoteMedia("https://storage.example/file", 2),
    ).rejects.toThrow("excede");
  });
});
