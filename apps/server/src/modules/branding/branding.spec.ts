import { afterEach, describe, expect, it, vi } from "vitest";
import {
  brandingCss,
  DEFAULT_BRANDING,
  themeSettingsSchema,
  THEME_COLORS,
} from "@buzrr/contract";
import { BrandingController } from "./branding.controller";
import { BrandingService } from "./branding.service";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import type { PrismaService } from "../../prisma/prisma.service";
import type { MediaStorage } from "../../common/storage/media-storage";

describe("theme contract and CSS", () => {
  it("provides every configurable color in both palettes", () => {
    const parsed = themeSettingsSchema.parse({
      light: DEFAULT_BRANDING.light,
      dark: DEFAULT_BRANDING.dark,
    });
    expect(Object.keys(parsed.light).sort()).toEqual(
      Object.keys(THEME_COLORS).sort(),
    );
    expect(Object.keys(parsed.dark).sort()).toEqual(
      Object.keys(THEME_COLORS).sort(),
    );
    const css = brandingCss(parsed);
    expect(css).toContain(":root.dark{");
    expect(brandingCss(DEFAULT_BRANDING)).toBe(css);
    for (const key of Object.keys(THEME_COLORS))
      expect(css).toContain(`--color-theme-${key}:`);
  });
  it("changes light and dark colors independently", () => {
    const css = brandingCss({
      light: { ...DEFAULT_BRANDING.light, primary: "#123456" },
      dark: { ...DEFAULT_BRANDING.dark, primary: "#abcdef" },
    });
    expect(css.split(":root.dark")[0]).toContain(
      "--color-theme-primary:#123456;",
    );
    expect(css.split(":root.dark")[1]).toContain(
      "--color-theme-primary:#abcdef;",
    );
  });
  it.each([
    "red",
    "#fff",
    "#000000;}body{display:none}",
    "</style><script>alert(1)</script>",
  ])("rejects invalid and injectable colors: %s", (primary) => {
    expect(() =>
      brandingCss({
        light: { ...DEFAULT_BRANDING.light, primary },
        dark: DEFAULT_BRANDING.dark,
      }),
    ).toThrow();
  });
  it("rejects incomplete palettes instead of publishing broken themes", () => {
    expect(
      themeSettingsSchema.safeParse({
        light: { primary: "#123456" },
        dark: DEFAULT_BRANDING.dark,
      }).success,
    ).toBe(false);
  });
});
function setup() {
  const db = {
    brandingSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const storage = {
    driver: "local",
    upload: vi.fn().mockResolvedValue({
      url: "http://localhost:3001/uploads/logo.png",
      mediaType: "image",
    }),
    remove: vi.fn(),
  };
  return {
    db,
    storage,
    service: new BrandingService(
      { db } as unknown as PrismaService,
      storage as unknown as MediaStorage,
    ),
  };
}
describe("branding persistence and access", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("serves a legacy logo through the current public origin without rewriting the DB", async () => {
    vi.stubEnv("STORAGE_PUBLIC_URL", "https://buzrr.maciel.tv/uploads/");
    const { service, db } = setup();
    db.brandingSettings.findUnique.mockResolvedValue({
      ...DEFAULT_BRANDING,
      logoUrl: "http://localhost:3001/uploads/logo.png",
    });
    expect((await service.read()).logoUrl).toBe(
      "https://buzrr.maciel.tv/uploads/logo.png",
    );
    expect(db.brandingSettings.upsert).not.toHaveBeenCalled();
  });
  it("falls back to original branding on a fresh installation", async () => {
    const { service } = setup();
    expect(await service.read()).toEqual(DEFAULT_BRANDING);
  });
  it("updates palettes without overwriting the logo", async () => {
    const { service, db } = setup();
    await service.colors({
      light: DEFAULT_BRANDING.light,
      dark: DEFAULT_BRANDING.dark,
    });
    expect(
      db.brandingSettings.upsert.mock.calls[0]?.[0].update,
    ).not.toHaveProperty("logoUrl");
  });
  it("accepts verified image uploads, preserves colors and restores only the logo", async () => {
    const { service, db, storage } = setup();
    const file = {
      size: 8,
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      mimetype: "application/octet-stream",
      originalname: "logo.bin",
    } as Express.Multer.File;
    await service.logo(file);
    expect(storage.upload).toHaveBeenCalled();
    expect(db.brandingSettings.upsert.mock.calls[0]?.[0].update).toEqual({
      logoUrl: "http://localhost:3001/uploads/logo.png",
    });
    await service.resetLogo();
    expect(db.brandingSettings.updateMany).toHaveBeenCalledWith({
      where: { id: "global" },
      data: { logoUrl: null },
    });
  });
  it("rejects scriptable/non-image uploads before storing them", async () => {
    const { service, storage } = setup();
    await expect(
      service.logo({
        size: 30,
        buffer: Buffer.from('<svg onload="alert(1)"/>'),
        mimetype: "image/png",
      } as Express.Multer.File),
    ).rejects.toThrow();
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it("requires admin/superadmin for every write", () => {
    for (const method of ["colors", "logo", "resetLogo"] as const)
      expect(
        Reflect.getMetadata(ROLES_KEY, BrandingController.prototype[method]),
      ).toEqual(["admin", "superadmin"]);
  });
});
