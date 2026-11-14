import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { zipSync, unzipSync } from "fflate";
import {
  BUILTIN_AVATAR_CATALOG,
  DEFAULT_BRANDING,
  type PortableQuiz,
  type PortableAppearance,
} from "@buzrr/contract";
import type { PrismaService } from "../../prisma/prisma.service";
import type { MediaStorage } from "../../common/storage/media-storage";
import type { EntitlementsService } from "../billing/entitlements.service";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { PortabilityService } from "./portability.service";
import { PortabilityController } from "./portability.controller";
import { digest, readArchive, writeArchive } from "./package-archive";

const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
const mediaPath = `media/${digest(png)}.png`;
const media = () => new Map([[mediaPath, png]]);
function quiz(): PortableQuiz {
  return {
    title: "Meu quiz",
    description: "Descrição",
    thumbnail: mediaPath,
    showFinalRanking: false,
    registrationFields: [
      {
        id: "team",
        label: "Equipe",
        type: "text",
        required: true,
        options: [],
      },
    ],
    questions: (
      [
        "multiple_choice",
        "true_false",
        "poll",
        "word_cloud",
        "rating",
        "open_text",
        "media_slide",
      ] as const
    ).map((type) => ({
      type,
      title: type === "media_slide" ? "" : type,
      timeOut: 15,
      config:
        type === "true_false"
          ? { answer: true, showRanking: false }
          : { showRanking: false },
      options:
        type === "multiple_choice" || type === "poll"
          ? [
              { title: "A", isCorrect: type === "multiple_choice" },
              { title: "B", isCorrect: false },
            ]
          : [],
      media: mediaPath,
      mediaType: "image" as const,
    })),
  };
}
function appearance(): PortableAppearance {
  return {
    colors: { light: DEFAULT_BRANDING.light, dark: DEFAULT_BRANDING.dark },
    logo: mediaPath,
    avatars: {
      mode: "colors",
      defaultId: "custom",
      avatars: [
        ...BUILTIN_AVATAR_CATALOG.avatars,
        {
          id: "custom",
          label: "Meu avatar",
          url: mediaPath,
          enabled: true,
          builtin: false,
        },
      ],
    },
  };
}
function setup() {
  const create = vi.fn().mockResolvedValue({ id: "new-quiz" });
  const tx = {
    quiz: { create, findFirst: vi.fn() },
    brandingSettings: {
      upsert: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    avatarCatalog: {
      upsert: vi
        .fn()
        .mockResolvedValue({ data: BUILTIN_AVATAR_CATALOG, revision: 4 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  };
  const db = {
    ...tx,
    $transaction: vi.fn(
      async (fn: ((value: typeof tx) => unknown) | Promise<unknown>[]) =>
        typeof fn === "function" ? fn(tx) : Promise.all(fn),
    ),
  };
  const storage = {
    read: vi.fn().mockResolvedValue(png),
    upload: vi
      .fn()
      .mockResolvedValue({ url: "/uploads/new.png", mediaType: "image" }),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const entitlements = { assertQuizCapacity: vi.fn() };
  const service = new PortabilityService(
    { db } as unknown as PrismaService,
    storage as unknown as MediaStorage,
    entitlements as unknown as EntitlementsService,
  );
  return { service, db, tx, storage, entitlements };
}

describe("portable packages", () => {
  it("imports every question type, remaps media, preserves settings and creates private drafts", async () => {
    const { service, tx, storage, entitlements } = setup();
    const buffer = writeArchive("quiz", quiz(), media());
    expect(service.preview(buffer, "quiz")).toMatchObject({
      title: "Meu quiz",
      questionCount: 7,
      mediaCount: 1,
    });
    expect(storage.upload).not.toHaveBeenCalled();
    await expect(service.importQuiz("owner", buffer)).resolves.toEqual({
      quizId: "new-quiz",
    });
    expect(storage.upload).toHaveBeenCalledTimes(8);
    expect(entitlements.assertQuizCapacity).toHaveBeenCalledTimes(2);
    const saved = tx.quiz.create.mock.calls[0]![0].data;
    expect(saved).toMatchObject({
      userId: "owner",
      isPublic: false,
      showFinalRanking: false,
      thumbnail: "/uploads/new.png",
      registrationFields: quiz().registrationFields,
    });
    expect(saved.questions.create).toHaveLength(7);
    for (const [index, q] of saved.questions.create.entries())
      expect(q).toMatchObject({
        order: index + 1,
        createdById: "owner",
        moderationStatus: "draft",
        media: "/uploads/new.png",
        config: { showRanking: false },
      });
    expect(saved).not.toHaveProperty("gameResults");
  });
  it("rejects foreign quiz exports and exports only explicit authored fields", async () => {
    const { service, tx } = setup();
    await expect(service.exportQuiz("owner", "other")).rejects.toThrow(
      "not found",
    );
    tx.quiz.findFirst.mockResolvedValue({
      ...quiz(),
      thumbnail: "/uploads/old.png",
      questions: quiz().questions.map((q) => ({
        ...q,
        media: "/uploads/old.png",
      })),
    });
    const output = readArchive(await service.exportQuiz("owner", "source"));
    expect(output.payload).toMatchObject({
      title: "Meu quiz",
      thumbnail: mediaPath,
    });
    expect(tx.quiz.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: "source", userId: "owner" } }),
    );
    expect(tx.quiz.findFirst.mock.calls.at(-1)![0].select).not.toHaveProperty(
      "gameResults",
    );
  });
  it("round-trips a video slide and creates independent objects for repeated images", async () => {
    const source = setup();
    const video = Buffer.from("000000186674797069736f6d0000000000", "hex");
    source.storage.read.mockImplementation(async (url: string) =>
      url.endsWith(".mp4") ? video : png,
    );
    const authored = quiz();
    source.tx.quiz.findFirst.mockResolvedValue({
      ...authored,
      thumbnail: "/uploads/cover.png",
      questions: authored.questions.map((q) => ({
        ...q,
        media:
          q.type === "media_slide"
            ? "/uploads/slide.mp4"
            : "/uploads/picture.png",
        mediaType: q.type === "media_slide" ? "video" : "image",
      })),
    });
    const zip = await source.service.exportQuiz("owner", "source");
    const destination = setup();
    let sequence = 0;
    destination.storage.upload.mockImplementation(async (bytes: Buffer) => ({
      url: `/uploads/copy-${sequence++}`,
      mediaType: bytes.equals(video) ? "video" : "image",
    }));
    await destination.service.importQuiz("other-owner", zip);
    const saved = destination.tx.quiz.create.mock.calls[0]![0].data;
    expect(saved.userId).toBe("other-owner");
    expect(
      new Set(saved.questions.create.map((q: { media: string }) => q.media))
        .size,
    ).toBe(7);
    expect(saved.questions.create.at(-1)).toMatchObject({
      type: "media_slide",
      mediaType: "video",
    });
  });

  it("does not upload anything when validation or quota checks fail", async () => {
    const { service, storage, entitlements } = setup();
    const bad = quiz();
    bad.questions[0]!.options.forEach((o) => (o.isCorrect = false));
    await expect(
      service.importQuiz("owner", writeArchive("quiz", bad, media())),
    ).rejects.toThrow();
    entitlements.assertQuizCapacity.mockRejectedValue(new Error("quota"));
    await expect(
      service.importQuiz("owner", writeArchive("quiz", quiz(), media())),
    ).rejects.toThrow("quota");
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it("cleans uploaded objects if database creation fails", async () => {
    const { service, storage, tx } = setup();
    tx.quiz.create.mockRejectedValue(new Error("DB unavailable"));
    await expect(
      service.importQuiz("owner", writeArchive("quiz", quiz(), media())),
    ).rejects.toThrow("DB unavailable");
    expect(storage.remove).toHaveBeenCalledWith("/uploads/new.png");
  });
  it("cleans earlier uploads if a later media upload fails", async () => {
    const { service, storage } = setup();
    const other = Buffer.concat([png, Buffer.from("other")]);
    const otherPath = `media/${digest(other)}.png`;
    const q = quiz();
    q.questions[0]!.media = otherPath;
    // First upload succeeds, second fails.
    storage.upload
      .mockReset()
      .mockResolvedValueOnce({ url: "/uploads/first.png", mediaType: "image" })
      .mockRejectedValueOnce(new Error("failed"));
    await expect(
      service.importQuiz(
        "owner",
        writeArchive("quiz", q, new Map([...media(), [otherPath, other]])),
      ),
    ).rejects.toThrow("failed");
    expect(storage.remove).toHaveBeenCalledWith("/uploads/first.png");
  });
  it("replaces appearance atomically and gives custom avatars new IDs", async () => {
    const { service, tx, storage } = setup();
    await service.importAppearance(
      writeArchive("appearance", appearance(), media()),
      { colors: true, logo: true, avatars: "replace" },
    );
    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(tx.brandingSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          logoUrl: "/uploads/new.png",
          light: DEFAULT_BRANDING.light,
        }),
      }),
    );
    const written = tx.avatarCatalog.updateMany.mock.calls[0]![0];
    expect(written.where).toEqual({ id: "global", revision: 4 });
    const catalog = written.data.data;
    expect(catalog.mode).toBe("colors");
    expect(catalog.defaultId).not.toBe("custom");
    expect(catalog.avatars.at(-1)).toMatchObject({
      id: catalog.defaultId,
      url: "/uploads/new.png",
    });
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it("selectively applies colors without uploads or avatar changes", async () => {
    const { service, tx, storage } = setup();
    await service.importAppearance(
      writeArchive("appearance", appearance(), media()),
      { colors: true, logo: false, avatars: "skip" },
    );
    expect(storage.upload).not.toHaveBeenCalled();
    expect(tx.avatarCatalog.upsert).not.toHaveBeenCalled();
    expect(
      tx.brandingSettings.upsert.mock.calls[0]![0].update,
    ).not.toHaveProperty("logoUrl");
  });
  it("adds custom avatars while retaining the current mode, initial avatar and builtins", async () => {
    const { service, tx } = setup();
    await service.importAppearance(
      writeArchive("appearance", appearance(), media()),
      { colors: false, logo: false, avatars: "add" },
    );
    const next = tx.avatarCatalog.updateMany.mock.calls[0]![0].data.data;
    expect(next.avatars).toHaveLength(
      BUILTIN_AVATAR_CATALOG.avatars.length + 1,
    );
    expect(next.defaultId).toBe(BUILTIN_AVATAR_CATALOG.defaultId);
    expect(next.mode).toBe("images");
    expect(tx.brandingSettings.upsert).not.toHaveBeenCalled();
  });
  it("rolls back imported uploads on an avatar revision conflict", async () => {
    const { service, tx, storage } = setup();
    tx.avatarCatalog.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.importAppearance(
        writeArchive("appearance", appearance(), media()),
        { colors: true, logo: true, avatars: "replace" },
      ),
    ).rejects.toThrow("catálogo mudou");
    expect(storage.remove).toHaveBeenCalledWith("/uploads/new.png");
  });
  it("guards all appearance routes with DB-backed admin roles", () => {
    for (const method of [
      "exportAppearance",
      "previewAppearance",
      "importAppearance",
    ] as const)
      expect(
        Reflect.getMetadata(ROLES_KEY, PortabilityController.prototype[method]),
      ).toEqual(["admin", "superadmin"]);
  });
  it("rejects mismatched package kinds, missing media and injected report data", () => {
    const { service } = setup();
    expect(() =>
      service.preview(writeArchive("quiz", quiz(), media()), "appearance"),
    ).toThrow("outro tipo");
    expect(() =>
      service.preview(writeArchive("quiz", quiz(), new Map()), "quiz"),
    ).toThrow("não encontrada");
    expect(() =>
      service.preview(
        writeArchive("quiz", { ...quiz(), gameResults: [] }, media()),
        "quiz",
      ),
    ).toThrow("inválida");
  });
  it("rejects invalid image bytes and arbitrary avatar URLs", () => {
    const { service } = setup();
    expect(() =>
      service.preview(
        writeArchive(
          "quiz",
          quiz(),
          new Map([[mediaPath, Buffer.from("<script>")]]),
        ),
        "quiz",
      ),
    ).toThrow("Mídia inválida");
    const a = appearance();
    a.avatars.avatars.at(-1)!.url = "http://127.0.0.1/secret";
    expect(() =>
      service.preview(writeArchive("appearance", a, media()), "appearance"),
    ).toThrow("Personalização inválida");
  });
});

describe("ZIP envelope validation", () => {
  it("rejects unsupported versions and checksum corruption", () => {
    const files = unzipSync(writeArchive("quiz", quiz(), media()));
    files[mediaPath] = Buffer.from("corrupt");
    expect(() => readArchive(Buffer.from(zipSync(files)))).toThrow(
      "corrompida",
    );
    const manifest = JSON.parse(
      Buffer.from(files["manifest.json"]!).toString(),
    );
    manifest.version = 2;
    files["manifest.json"] = Buffer.from(JSON.stringify(manifest));
    expect(() => readArchive(Buffer.from(zipSync(files)))).toThrow(
      "incompatível",
    );
  });
  it("rejects path traversal, truncated archives, and undeclared files", () => {
    const good = writeArchive("quiz", quiz(), media());
    expect(() => readArchive(good.subarray(0, good.length - 10))).toThrow(
      "incompleto",
    );
    expect(() =>
      readArchive(Buffer.from(zipSync({ "../secret": png }))),
    ).toThrow("caminho inválido");
    const files = unzipSync(good);
    files["appearance.json"] = Buffer.from("{}");
    expect(() => readArchive(Buffer.from(zipSync(files)))).toThrow(
      "não declarados",
    );
  });
  it("rejects duplicate local file entries", () => {
    const packed = Buffer.from(
      zipSync({
        "quiz.json": Buffer.from("{}"),
        "evil.json": Buffer.from("{}"),
      }),
    );
    let position = packed.indexOf("evil.json");
    while (position !== -1) {
      packed.write("quiz.json", position);
      position = packed.indexOf("evil.json");
    }
    expect(() => readArchive(packed)).toThrow("duplicado");
  });

  it("rejects oversized inflated JSON even when its ZIP size headers lie", () => {
    const packed = Buffer.from(
      zipSync({ "manifest.json": Buffer.alloc(3 * 1024 * 1024, 32) }),
    );
    packed.writeUInt32LE(1, 22); // forged local uncompressed size
    expect(() => readArchive(packed)).toThrow("limite");
  });
});
