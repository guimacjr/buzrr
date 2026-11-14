import {
  choiceQuestionTextSchema,
  MAX_OPTIONS,
  MIN_OPTIONS,
  RATING_LABEL_MAX,
  questionTypeSchema,
  ratingScaleSchema,
} from "@buzrr/contract";
import { z } from "zod";

export const createQuizSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export const createAiQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  questions: z.coerce.number().int().min(1).max(15),
  time: z.coerce
    .number()
    .int("Use whole seconds")
    .min(5, "At least 5 seconds")
    .max(600, "At most 600 seconds"),
});

export const createPlayerSchema = z.object({
  username: z
    .string()
    .min(1, "Informe seu nome")
    .max(30, "Use no máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]*$/, "Use apenas letras, números e sublinhados"),
  profile: z.string().min(1),
});

export const updatePlayerNameSchema = z.object({
  username: z
    .string()
    .min(1, "Informe seu nome")
    .max(30, "Use no máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]*$/, "Use apenas letras, números e sublinhados"),
});

export const hostQuizSchema = z.object({
  quizId: z.string().min(1),
});

const authoredOption = z.object({
  title: z.string(),
  isCorrect: z.boolean(),
});

/**
 * The question editor's values. One shape for every type — the editor keeps
 * each type's settings while the author flips between types — checked per
 * type on submit.
 */
export const addQuestionSchema = z
  .object({
    type: questionTypeSchema,
    showRanking: z.boolean(),
    fullScreen: z.boolean(),
    title: z.string().trim(),
    time: z.coerce.number().min(1).optional(),
    options: z.array(authoredOption),
    mcqMulti: z.boolean(),
    pollMulti: z.boolean(),
    cloudMaxAnswers: z.number().int().min(1).max(3),
    cloudMaxLength: z.union([z.literal(20), z.literal(40)]),
    ratingScale: ratingScaleSchema,
    lowLabel: z.string().max(RATING_LABEL_MAX),
    highLabel: z.string().max(RATING_LABEL_MAX),
    textMaxLength: z.union([z.literal(100), z.literal(200), z.literal(500)]),
    allowAnonymous: z.boolean(),
    multipleSubmissions: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "poll" || v.type === "multiple_choice") {
      const parsed = choiceQuestionTextSchema.safeParse(v);
      if (!parsed.success)
        parsed.error.issues.forEach((issue) =>
          ctx.addIssue({
            code: "custom",
            path: issue.path,
            message: issue.message,
          }),
        );
    }
    if (v.type !== "media_slide" && !v.title)
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Write the question",
      });
    if (!["multiple_choice", "true_false", "poll"].includes(v.type)) return;
    if (
      v.type !== "true_false" &&
      (v.options.length < MIN_OPTIONS || v.options.length > MAX_OPTIONS)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `Use between ${MIN_OPTIONS} and ${MAX_OPTIONS} options`,
      });
    }
    v.options.forEach((o, i) => {
      if (o.title.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["options", i, "title"],
          message: "Options can't be empty",
        });
      }
    });
    const correct = v.options.filter((o) => o.isCorrect).length;
    if (
      v.type === "multiple_choice" &&
      (v.mcqMulti ? correct === 0 : correct !== 1)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: v.mcqMulti
          ? "Mark at least one option correct"
          : "Mark the correct option",
      });
    }
    if (v.type === "true_false" && correct !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Mark True or False as the correct answer",
      });
    }
  });

export const createSpaceSchema = z.object({
  name: z.string().min(1, "Give your space a name").max(200),
  description: z.string().max(2000).optional(),
});

export const generateQuestionsSchema = z.object({
  prompt: z.string().min(3, "Describe what you want generated").max(2000),
  count: z.coerce.number().int().min(1).max(30, "Use no máximo 30 caracteres"),
});
