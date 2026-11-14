import { z } from "zod";

export const registrationFieldSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .max(80),
    label: z.string().trim().min(1).max(150),
    type: z.enum(["text", "alphanumeric", "checkbox", "dropdown"]),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(150)).max(100).default([]),
  })
  .superRefine((field, ctx) => {
    if (
      field.type === "dropdown" &&
      (!field.options.length ||
        new Set(field.options).size !== field.options.length)
    )
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Provide distinct dropdown options",
      });
  });
export const registrationFieldsSchema = z
  .array(registrationFieldSchema)
  .max(30)
  .superRefine((fields, ctx) => {
    if (new Set(fields.map((f) => f.id)).size !== fields.length)
      ctx.addIssue({ code: "custom", message: "Field IDs must be unique" });
  });
export const registrationAnswersSchema = z.record(
  z.string(),
  z.union([z.string().max(2000), z.boolean()]),
);
export const registrationSettingsSchema = z.object({
  fields: registrationFieldsSchema,
});
export const joinRoomSchema = z.object({
  gameCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/),
  registrationAnswers: registrationAnswersSchema.optional(),
});
export type RegistrationField = z.infer<typeof registrationFieldSchema>;
export type RegistrationAnswers = z.infer<typeof registrationAnswersSchema>;
export type RegistrationSettings = z.infer<typeof registrationSettingsSchema>;
export type JoinRoomBody = z.infer<typeof joinRoomSchema>;

/** Same validation at entry on both clients and server. Checkbox required means checked. */
export function validateRegistrationAnswers(
  fields: RegistrationField[],
  input: unknown,
): RegistrationAnswers {
  const parsed = registrationAnswersSchema.parse(input ?? {});
  const result: RegistrationAnswers = {};
  for (const field of fields) {
    const raw = parsed[field.id];
    if (field.type === "checkbox") {
      if (raw !== undefined && typeof raw !== "boolean")
        throw new Error(`${field.label}: expected a checkbox`);
      if (field.required && raw !== true)
        throw new Error(`${field.label}: required`);
      result[field.id] = raw === true;
      continue;
    }
    if (raw !== undefined && typeof raw !== "string")
      throw new Error(`${field.label}: expected text`);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value && field.required) throw new Error(`${field.label}: required`);
    if (
      value &&
      field.type === "alphanumeric" &&
      !/^[\p{L}\p{N}]+$/u.test(value)
    )
      throw new Error(`${field.label}: use letters and numbers only`);
    if (value && field.type === "dropdown" && !field.options.includes(value))
      throw new Error(`${field.label}: choose one of the listed options`);
    result[field.id] = value;
  }
  return result;
}

export const sessionReportSchema = z.object({
  version: z.literal(1),
  fields: registrationFieldsSchema,
  questions: z.array(
    z.object({ id: z.string(), title: z.string(), type: z.string() }),
  ),
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      registrationAnswers: registrationAnswersSchema,
      responses: z.array(
        z.object({
          questionId: z.string(),
          answer: z.string().nullable(),
          status: z.enum([
            "answered",
            "unanswered",
            "not_presented",
            "media_slide",
          ]),
          correct: z.boolean().nullable(),
          score: z.number(),
          timeTakenMs: z.number().nullable(),
        }),
      ),
    }),
  ),
});
export type SessionReport = z.infer<typeof sessionReportSchema>;
