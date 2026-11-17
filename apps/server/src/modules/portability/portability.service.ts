import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  avatarCatalogSchema,
  brandingSchema,
  BUILTIN_AVATAR_CATALOG,
  DEFAULT_BRANDING,
  PACKAGE_MAX_BYTES,
  PACKAGE_MEDIA_MAX_BYTES,
  portableAppearanceSchema,
  portableQuizSchema,
  type AppearanceImportOptions,
  type PackagePreview,
  type BulkQuizResult,
  type PortableAppearance,
  type PortableQuiz,
} from "@buzrr/contract";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import {
  MediaStorage,
  MediaUnavailableError,
  UnsupportedMediaError,
  type StoredMedia,
} from "../../common/storage/media-storage";
import { sniffMedia } from "../../common/storage/image-sniff";
import { EntitlementsService } from "../billing/entitlements.service";
import { validateDefinition, QuestionDefinitionError } from "../question-types";
import { digest, readArchive, writeArchive } from "./package-archive";

type ParsedPackage = ReturnType<typeof readArchive> &
  (
    | { kind: "quiz"; data: PortableQuiz }
    | { kind: "appearance"; data: PortableAppearance }
  );

@Injectable()
export class PortabilityService {
  private readonly logger = new Logger(PortabilityService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MediaStorage,
    private readonly entitlements: EntitlementsService,
  ) {}

  private collector() {
    const media = new Map<string, Buffer>();
    const urls = new Map<string, string>();
    let total = 0;
    const add = async (url: string | null): Promise<string | null> => {
      if (!url) return null;
      const existing = urls.get(url);
      if (existing) return existing;
      let bytes: Buffer;
      try {
        bytes = await this.storage.read(url, PACKAGE_MEDIA_MAX_BYTES);
      } catch {
        throw new BadRequestException(
          "Não foi possível incluir uma mídia. Verifique se ela existe no armazenamento atual ou envie-a novamente antes de exportar.",
        );
      }
      const { ext } = sniffMedia(bytes);
      const path = `media/${digest(bytes)}.${ext}`;
      if (!media.has(path)) {
        total += bytes.length;
        if (total > PACKAGE_MAX_BYTES - 3 * 1024 * 1024)
          throw new BadRequestException(
            "Pacote excede 100 MB. Reduza as mídias.",
          );
        media.set(path, bytes);
      }
      urls.set(url, path);
      return path;
    };
    return { media, add };
  }

  async exportQuiz(userId: string, quizId: string) {
    const quiz = await this.prisma.db.quiz.findFirst({
      where: { id: quizId, userId },
      select: {
        title: true,
        description: true,
        thumbnail: true,
        showFinalRanking: true,
        registrationFields: true,
        questions: {
          orderBy: { order: "asc" },
          select: {
            type: true,
            title: true,
            timeOut: true,
            config: true,
            media: true,
            mediaType: true,
            options: { select: { title: true, isCorrect: true } },
          },
        },
      },
    });
    if (!quiz) throw new NotFoundException("Unauthorized or quiz not found");
    const { media, add } = this.collector();
    const questions = [];
    for (const question of quiz.questions)
      questions.push({ ...question, media: await add(question.media) });
    const payload = this.quizData({
      ...quiz,
      thumbnail: await add(quiz.thumbnail),
      questions,
    });
    const archive = writeArchive("quiz", payload, media);
    // Export must satisfy exactly the same rules as import.
    this.parse(archive, "quiz");
    return archive;
  }

  async exportAppearance() {
    const [branding, catalog] = await this.prisma.db.$transaction([
      this.prisma.db.brandingSettings.findUnique({ where: { id: "global" } }),
      this.prisma.db.avatarCatalog.findUnique({ where: { id: "global" } }),
    ]);
    const colors = brandingSchema.parse(
      branding
        ? {
            light: branding.light,
            dark: branding.dark,
            logoUrl: branding.logoUrl,
          }
        : DEFAULT_BRANDING,
    );
    const source = avatarCatalogSchema.parse(
      catalog?.data ?? BUILTIN_AVATAR_CATALOG,
    );
    const { media, add } = this.collector();
    const avatars = [];
    for (const avatar of source.avatars)
      avatars.push({
        ...avatar,
        url: avatar.builtin ? avatar.url : (await add(avatar.url))!,
      });
    const payload: PortableAppearance = {
      colors: { light: colors.light, dark: colors.dark },
      logo: await add(colors.logoUrl),
      avatars: { ...source, avatars },
    };
    const archive = writeArchive("appearance", payload, media);
    this.parse(archive, "appearance");
    return archive;
  }

  private quizData(payload: unknown): PortableQuiz {
    const parsed = portableQuizSchema.safeParse(payload);
    if (!parsed.success)
      throw new BadRequestException(
        "Definição de quiz inválida: " +
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
      );
    return {
      ...parsed.data,
      questions: parsed.data.questions.map((q, index) => {
        try {
          return { ...q, ...validateDefinition(q.type, q) };
        } catch (error) {
          if (error instanceof QuestionDefinitionError)
            throw new BadRequestException(
              `Pergunta ${index + 1}: ${error.message}`,
            );
          throw error;
        }
      }),
    };
  }

  private parse(buffer: Buffer, kind: "quiz" | "appearance"): ParsedPackage {
    const archive = readArchive(buffer);
    if (archive.manifest.kind !== kind)
      throw new BadRequestException(
        "Este pacote é de outro tipo. Use a importação correspondente.",
      );
    let parsed: ParsedPackage;
    if (kind === "quiz")
      parsed = { ...archive, kind, data: this.quizData(archive.payload) };
    else {
      const result = portableAppearanceSchema.safeParse(archive.payload);
      if (!result.success)
        throw new BadRequestException(
          "Personalização inválida ou incompatível.",
        );
      parsed = { ...archive, kind, data: result.data };
    }
    const used = new Set<string>();
    const check = (
      path: string | null,
      expected: "image" | "video" = "image",
    ) => {
      if (!path) return;
      const bytes = archive.files.get(path);
      if (!bytes || !archive.manifest.media.some((m) => m.path === path))
        throw new BadRequestException("Mídia referenciada não encontrada.");
      try {
        if (sniffMedia(bytes).mediaType !== expected)
          throw new UnsupportedMediaError("Tipo de mídia incorreto.");
      } catch {
        throw new BadRequestException("Mídia inválida no pacote.");
      }
      used.add(path);
    };
    if (parsed.kind === "quiz") {
      check(parsed.data.thumbnail);
      for (const q of parsed.data.questions)
        check(q.media, q.mediaType ?? "image");
    } else {
      check(parsed.data.logo);
      for (const a of parsed.data.avatars.avatars) if (!a.builtin) check(a.url);
    }
    if (used.size !== archive.manifest.media.length)
      throw new BadRequestException("O pacote contém mídias sem referência.");
    return parsed;
  }

  preview(buffer: Buffer, kind: "quiz" | "appearance"): PackagePreview {
    const parsed = this.parse(buffer, kind);
    const stats = {
      mediaCount: parsed.manifest.media.length,
      mediaBytes: parsed.manifest.media.reduce((sum, m) => sum + m.bytes, 0),
    };
    return parsed.kind === "quiz"
      ? {
          kind: "quiz",
          title: parsed.data.title,
          questionCount: parsed.data.questions.length,
          ...stats,
        }
      : {
          kind: "appearance",
          colors: parsed.data.colors,
          hasLogo: Boolean(parsed.data.logo),
          avatarCount: parsed.data.avatars.avatars.length,
          avatarMode: parsed.data.avatars.mode,
          ...stats,
        };
  }

  private async withUploads<T>(
    parsed: ParsedPackage,
    references: { key: string; path: string | null }[],
    save: (uploaded: Map<string, StoredMedia>) => Promise<T>,
  ): Promise<T> {
    const uploaded = new Map<string, StoredMedia>();
    try {
      for (const { key, path } of references) {
        if (!path || uploaded.has(key)) continue;
        const bytes = parsed.files.get(path)!;
        const meta = sniffMedia(bytes);
        uploaded.set(
          key,
          await this.storage.upload(bytes, {
            contentType: meta.type,
            filename: path.split("/").pop(),
          }),
        );
      }
      return await save(uploaded);
    } catch (error) {
      // Only newly uploaded objects are removed; published/old avatar URLs remain valid.
      await Promise.all(
        [...uploaded.values()].map((m) =>
          this.storage
            .remove(m.url)
            .catch(() =>
              this.logger.warn(
                "Failed to remove an uncommitted package upload",
              ),
            ),
        ),
      );
      if (error instanceof MediaUnavailableError)
        throw new ServiceUnavailableException(error.message);
      if (error instanceof UnsupportedMediaError)
        throw new BadRequestException(error.message);
      throw error;
    }
  }

  async importQuizBulk(
    userIds: string[],
    buffer: Buffer,
  ): Promise<BulkQuizResult[]> {
    // Reject a malformed archive before creating any copies.
    this.preview(buffer, "quiz");
    const users = await this.prisma.db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });
    const existing = new Set(users.map((user) => user.id));
    const results: BulkQuizResult[] = [];
    for (const userId of userIds) {
      if (!existing.has(userId)) {
        results.push({ userId, error: "Conta não encontrada." });
        continue;
      }
      try {
        results.push({ userId, ...(await this.importQuiz(userId, buffer)) });
      } catch (error) {
        results.push({
          userId,
          error:
            error instanceof HttpException && error.getStatus() < 500
              ? error.message
              : "Não foi possível importar o quiz nesta conta.",
        });
      }
    }
    return results;
  }

  async importQuiz(userId: string, buffer: Buffer) {
    const parsed = this.parse(buffer, "quiz");
    if (parsed.kind !== "quiz") throw new BadRequestException();
    await this.prisma.db.$transaction((tx) =>
      this.entitlements.assertQuizCapacity(tx, userId),
    );
    const quiz = parsed.data;
    // Question editing deletes replaced media, so each question needs its own stored
    // object even when the archive deduplicates identical bytes.
    const references = [
      { key: "thumbnail", path: quiz.thumbnail },
      ...quiz.questions.map((q, i) => ({
        key: `question-${i}`,
        path: q.media,
      })),
    ];
    return this.withUploads(parsed, references, async (uploaded) => {
      const result = await this.prisma.db.$transaction(async (tx) => {
        await this.entitlements.assertQuizCapacity(tx, userId);
        return tx.quiz.create({
          data: {
            title: quiz.title,
            description: quiz.description,
            userId,
            isPublic: false,
            thumbnail: quiz.thumbnail ? uploaded.get("thumbnail")!.url : null,
            showFinalRanking: quiz.showFinalRanking,
            registrationFields: quiz.registrationFields,
            questions: {
              create: quiz.questions.map((q, index) => ({
                title: q.title,
                type: q.type,
                timeOut: q.timeOut,
                config:
                  q.config as import("@buzrr/prisma").Prisma.InputJsonObject,
                order: index + 1,
                createdById: userId,
                moderationStatus: "draft",
                media: q.media ? uploaded.get(`question-${index}`)!.url : null,
                mediaType: q.media
                  ? uploaded.get(`question-${index}`)!.mediaType
                  : null,
                options: { create: q.options },
              })),
            },
          },
        });
      });
      return { quizId: result.id };
    });
  }

  async importAppearance(buffer: Buffer, options: AppearanceImportOptions) {
    const parsed = this.parse(buffer, "appearance");
    if (parsed.kind !== "appearance") throw new BadRequestException();
    const data = parsed.data;
    const paths = [
      options.logo ? data.logo : null,
      ...(options.avatars === "skip"
        ? []
        : data.avatars.avatars.filter((a) => !a.builtin).map((a) => a.url)),
    ];
    return this.withUploads(
      parsed,
      paths.map((path) => ({ key: path ?? "", path })),
      async (uploaded) => {
        await this.prisma.db.$transaction(async (tx) => {
          if (options.colors || options.logo) {
            const update = {
              ...(options.colors ? data.colors : {}),
              ...(options.logo
                ? { logoUrl: data.logo ? uploaded.get(data.logo)!.url : null }
                : {}),
            };
            await tx.brandingSettings.upsert({
              where: { id: "global" },
              create: {
                id: "global",
                light: DEFAULT_BRANDING.light,
                dark: DEFAULT_BRANDING.dark,
                ...update,
              },
              update,
            });
          }
          if (options.avatars !== "skip") {
            const row = await tx.avatarCatalog.upsert({
              where: { id: "global" },
              create: { id: "global", data: BUILTIN_AVATAR_CATALOG },
              update: {},
            });
            const current = avatarCatalogSchema.parse(row.data);
            const incoming = data.avatars.avatars.map((a) => ({
              ...a,
              id: a.builtin ? a.id : randomUUID(),
              url: a.builtin ? a.url : uploaded.get(a.url)!.url,
            }));
            const defaultId =
              incoming[
                data.avatars.avatars.findIndex(
                  (a) => a.id === data.avatars.defaultId,
                )
              ]!.id;
            const next =
              options.avatars === "replace"
                ? { ...data.avatars, avatars: incoming, defaultId }
                : {
                    ...current,
                    avatars: [
                      ...current.avatars,
                      ...incoming.filter(
                        (a) => !current.avatars.some((c) => c.id === a.id),
                      ),
                    ],
                  };
            if (next.avatars.length > 1000)
              throw new BadRequestException(
                "O catálogo resultante excede 1000 avatares.",
              );
            const changed = await tx.avatarCatalog.updateMany({
              where: { id: "global", revision: row.revision },
              data: { data: next, revision: { increment: 1 } },
            });
            if (!changed.count)
              throw new ConflictException(
                "O catálogo mudou. Tente importar novamente.",
              );
          }
        });
        return {};
      },
    );
  }
}
