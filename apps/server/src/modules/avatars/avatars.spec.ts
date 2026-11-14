import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyAvatarAction,
  avatarCatalogSchema,
  COLOR_AVATARS,
  BUILTIN_AVATAR_CATALOG,
  type AvatarCatalog,
} from "@buzrr/contract";
import { AvatarsService } from "./avatars.service";
import { AvatarsController } from "./avatars.controller";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import type { PrismaService } from "../../prisma/prisma.service";
import type { MediaStorage } from "../../common/storage/media-storage";

const custom = {
  id: "custom",
  label: "Team",
  url: "http://localhost:3001/uploads/team.png",
  builtin: false,
  enabled: true,
};
function catalog(): AvatarCatalog {
  return structuredClone(BUILTIN_AVATAR_CATALOG);
}
function setup(initial = catalog()) {
  let current = initial;
  const updateMany = vi
    .fn()
    .mockImplementation(async (args: { data: { data: AvatarCatalog } }) => {
      current = args.data.data;
      return { count: 1 };
    });
  const db = {
    avatarCatalog: {
      findUnique: vi.fn().mockImplementation(async () => ({ data: current })),
      findUniqueOrThrow: vi
        .fn()
        .mockImplementation(async () => ({ data: current, revision: 0 })),
      upsert: vi.fn(),
      updateMany,
    },
  };
  const storage = {
    driver: "local",
    upload: vi.fn().mockResolvedValue({ url: custom.url, mediaType: "image" }),
    remove: vi.fn(),
  };
  return {
    service: new AvatarsService(
      { db } as unknown as PrismaService,
      storage as unknown as MediaStorage,
    ),
    db,
    storage,
  };
}
describe("global avatar catalog", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("defaults legacy catalogs to image mode", () => {
    const { mode: _mode, ...legacy } = catalog();
    expect(avatarCatalogSchema.parse(legacy).mode).toBe("images");
  });
  it("switches to colors without losing images or the initial choice", async () => {
    const original = applyAvatarAction(catalog(), {
      action: "default",
      id: "builtin-3",
    });
    const { service } = setup(original);
    const colors = await service.update({ action: "mode", mode: "colors" });
    expect(colors.avatars).toEqual(original.avatars);
    expect(colors.defaultId).toBe(original.defaultId);
    expect((await service.publicCatalog()).avatars).toEqual(COLOR_AVATARS);
    await expect(
      service.assertSelectable(original.avatars[0]!.url),
    ).rejects.toThrow();
    for (const color of COLOR_AVATARS)
      await expect(
        service.assertSelectable(color.url),
      ).resolves.toBeUndefined();
    await service.update({ action: "mode", mode: "images" });
    expect(await service.catalog()).toEqual(original);
    await expect(
      service.assertSelectable(COLOR_AVATARS[0]!.url),
    ).rejects.toThrow();
  });
  it("serves old localhost uploads at the configured public URL and validates selection", async () => {
    vi.stubEnv("STORAGE_PUBLIC_URL", "https://buzrr.maciel.tv/uploads/");
    const original = catalog();
    original.avatars.push(custom);
    const { service, db } = setup(original);
    const url = "https://buzrr.maciel.tv/uploads/team.png";
    expect((await service.catalog()).avatars.at(-1)?.url).toBe(url);
    await expect(service.assertSelectable(url)).resolves.toBeUndefined();
    expect(original.avatars.at(-1)?.url).toBe(custom.url);
    expect(db.avatarCatalog.updateMany).not.toHaveBeenCalled();
    const updated = await service.update({ action: "default", id: custom.id });
    expect(updated.avatars.at(-1)?.url).toBe(url);
  });
  it("preserves external images and other storage drivers", async () => {
    vi.stubEnv("STORAGE_PUBLIC_URL", "https://buzrr.maciel.tv/uploads");
    const original = catalog();
    original.avatars.push({
      ...custom,
      url: "https://cdn.example.com/team.png",
    });
    const { service, storage } = setup(original);
    expect((await service.catalog()).avatars.at(-1)?.url).toBe(
      original.avatars.at(-1)?.url,
    );
    original.avatars[original.avatars.length - 1] = custom;
    storage.driver = "s3";
    expect((await service.catalog()).avatars.at(-1)?.url).toBe(custom.url);
  });
  it("hides builtins, replaces the initial choice and retains the old asset records", () => {
    const original = catalog();
    original.avatars.push(custom);
    const next = applyAvatarAction(original, {
      action: "builtins",
      enabled: false,
    });
    expect(next.avatars.filter((a) => a.enabled)).toEqual([custom]);
    expect(next.defaultId).toBe(custom.id);
    expect(next.avatars).toHaveLength(original.avatars.length);
    expect(original.avatars[0]?.enabled).toBe(true);
    expect(
      applyAvatarAction(next, {
        action: "builtins",
        enabled: true,
      }).avatars.every((a) => a.enabled),
    ).toBe(true);
  });
  it("does not permit an empty list or an unavailable initial avatar", () => {
    expect(() =>
      applyAvatarAction(catalog(), { action: "builtins", enabled: false }),
    ).toThrow("at least one");
    const disabled = applyAvatarAction(catalog(), {
      action: "enabled",
      id: "builtin-1",
      enabled: false,
    });
    expect(() =>
      applyAvatarAction(disabled, { action: "default", id: "builtin-1" }),
    ).toThrow("Enable");
    expect(() =>
      applyAvatarAction(disabled, { action: "default", id: "missing" }),
    ).toThrow("not found");
  });
  it("exposes only active choices and rejects hidden/arbitrary URLs on new player creation", async () => {
    const { service } = setup(
      applyAvatarAction(catalog(), {
        action: "enabled",
        id: "builtin-1",
        enabled: false,
      }),
    );
    expect((await service.publicCatalog()).avatars).toHaveLength(10);
    await expect(
      service.assertSelectable("/images/player_profile/profile1.png"),
    ).rejects.toThrow("no longer available");
    await expect(
      service.assertSelectable("https://elsewhere/avatar.png"),
    ).rejects.toThrow();
    await expect(
      service.assertSelectable("/images/player_profile/profile2.png"),
    ).resolves.toBeUndefined();
  });
  it("retries a concurrent update instead of overwriting a newer catalog", async () => {
    const { service, db } = setup();
    db.avatarCatalog.updateMany.mockResolvedValueOnce({ count: 0 });
    await service.update({ action: "default", id: "builtin-2" });
    expect(db.avatarCatalog.updateMany).toHaveBeenCalledTimes(2);
    expect((await service.catalog()).defaultId).toBe("builtin-2");
  });
  it("rejects videos and uploads verified image bytes without trusting the filename", async () => {
    const { service, storage } = setup();
    const invalid = {
      size: 20,
      buffer: Buffer.from("not an image"),
      mimetype: "image/png",
      originalname: "fake.png",
    } as Express.Multer.File;
    await expect(service.upload(invalid, "Fake")).rejects.toThrow();
    expect(storage.upload).not.toHaveBeenCalled();
    const valid = {
      ...invalid,
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      size: 8,
      originalname: "file.bin",
    };
    const result = await service.upload(valid, "Team");
    expect(result.avatars.at(-1)).toMatchObject({
      label: "Team",
      builtin: false,
      enabled: true,
      url: custom.url,
    });
  });
  it("requires DB-checked admin roles on every management endpoint", () => {
    for (const method of ["manage", "update", "upload"] as const) {
      expect(
        Reflect.getMetadata(ROLES_KEY, AvatarsController.prototype[method]),
      ).toEqual(["admin", "superadmin"]);
    }
  });
});
