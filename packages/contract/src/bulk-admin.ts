import { z } from "zod";

export const bulkAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});
export const bulkAccountsSchema = z
  .array(bulkAccountSchema)
  .min(1)
  .max(100)
  .refine(
    (rows) => new Set(rows.map((row) => row.email)).size === rows.length,
    {
      message: "Há e-mails repetidos na lista.",
    },
  );
export const bulkQuizTargetsSchema = z
  .array(z.string().min(1).max(128))
  .min(1)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Contas repetidas.",
  });
export type BulkAccountResult = {
  email: string;
  userId?: string;
  error?: string;
};
export type BulkQuizResult = {
  userId: string;
  quizId?: string;
  error?: string;
};
