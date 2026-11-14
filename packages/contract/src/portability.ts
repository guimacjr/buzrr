import { z } from "zod";
import { authoredOptionSchema } from "./rest";
import {
  choiceQuestionTextSchema,
  MAX_OPTIONS,
  MIN_TIME_OUT,
  questionTypeSchema,
} from "./question-types";
import { registrationFieldsSchema } from "./registration";
import { avatarCatalogSchema, BUILTIN_AVATAR_CATALOG } from "./avatars";
import { themeSettingsSchema } from "./branding";

export const PACKAGE_MAX_BYTES = 100 * 1024 * 1024;
export const PACKAGE_MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export const packageMediaPathSchema = z
  .string()
  .regex(/^media\/[a-f0-9]{64}\.(png|jpg|gif|webp|avif|mp4|webm)$/);
export const packageManifestSchema = z
  .object({
    format: z.literal("buzrr"),
    version: z.literal(1),
    kind: z.enum(["quiz", "appearance"]),
    media: z
      .array(
        z
          .object({
            path: packageMediaPathSchema,
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            bytes: z.number().int().positive().max(PACKAGE_MEDIA_MAX_BYTES),
          })
          .strict(),
      )
      .max(1000),
  })
  .strict();

export const portableQuizSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(10000).nullable(),
    thumbnail: packageMediaPathSchema.nullable(),
    showFinalRanking: z.boolean(),
    registrationFields: registrationFieldsSchema,
    questions: z
      .array(
        z
          .object({
            type: questionTypeSchema,
            title: z.string().max(2000),
            timeOut: z.number().int().min(MIN_TIME_OUT).max(2147483647),
            config: z.record(z.string(), z.unknown()),
            options: z.array(authoredOptionSchema).max(MAX_OPTIONS),
            media: packageMediaPathSchema.nullable(),
            mediaType: z.enum(["image", "video"]).nullable(),
          })
          .strict()
          .superRefine((q, ctx) => {
            if (q.type !== "media_slide" && !q.title.trim())
              ctx.addIssue({
                code: "custom",
                message: "Question title is required",
              });
            if (q.type === "media_slide" && !q.media)
              ctx.addIssue({
                code: "custom",
                message: "Media slide requires media",
              });
            if (
              Boolean(q.media) !== Boolean(q.mediaType) ||
              (q.mediaType === "video" && q.type !== "media_slide")
            )
              ctx.addIssue({
                code: "custom",
                message: "Invalid question media",
              });
            if (q.type === "multiple_choice" || q.type === "poll") {
              const parsed = choiceQuestionTextSchema.safeParse(q);
              if (!parsed.success)
                for (const issue of parsed.error.issues)
                  ctx.addIssue({
                    code: "custom",
                    path: issue.path,
                    message: issue.message,
                  });
            }
          }),
      )
      .max(1000),
  })
  .strict();

export const portableAppearanceSchema = z
  .object({
    colors: themeSettingsSchema,
    logo: packageMediaPathSchema.nullable(),
    avatars: avatarCatalogSchema.superRefine((catalog, ctx) => {
      if (
        catalog.avatars.length > 1000 ||
        new Set(catalog.avatars.map((a) => a.id)).size !==
          catalog.avatars.length
      )
        ctx.addIssue({
          code: "custom",
          message: "Invalid avatar count or duplicate IDs",
        });
      if (!catalog.avatars.some((a) => a.id === catalog.defaultId && a.enabled))
        ctx.addIssue({
          code: "custom",
          message: "Default avatar must be enabled",
        });
      for (const a of catalog.avatars) {
        const valid = a.builtin
          ? BUILTIN_AVATAR_CATALOG.avatars.some(
              (b) => b.id === a.id && b.url === a.url,
            )
          : packageMediaPathSchema.safeParse(a.url).success;
        if (!valid)
          ctx.addIssue({
            code: "custom",
            message: "Invalid avatar media reference",
          });
      }
    }),
  })
  .strict();

export const appearanceImportOptionsSchema = z
  .object({
    colors: z.boolean(),
    logo: z.boolean(),
    avatars: z.enum(["skip", "add", "replace"]),
  })
  .strict()
  .refine(
    (o) => o.colors || o.logo || o.avatars !== "skip",
    "Choose at least one section",
  );

export const packagePreviewSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("quiz"),
    title: z.string(),
    questionCount: z.number(),
    mediaCount: z.number(),
    mediaBytes: z.number(),
  }),
  z.object({
    kind: z.literal("appearance"),
    colors: themeSettingsSchema,
    hasLogo: z.boolean(),
    avatarCount: z.number(),
    avatarMode: z.enum(["images", "colors"]),
    mediaCount: z.number(),
    mediaBytes: z.number(),
  }),
]);
export type PackageManifest = z.infer<typeof packageManifestSchema>;
export type PortableQuiz = z.infer<typeof portableQuizSchema>;
export type PortableAppearance = z.infer<typeof portableAppearanceSchema>;
export type AppearanceImportOptions = z.infer<
  typeof appearanceImportOptionsSchema
>;
export type PackagePreview = z.infer<typeof packagePreviewSchema>;
export type PackageImportResult = { quizId?: string };
