import { describe, expect, it } from "vitest";
import { questionDefinitionSchema } from "@buzrr/contract";
import { addQuestionSchema } from "../schemas";

const form = {
  showRanking: true,
  fullScreen: false,
  time: 15,
  mcqMulti: false,
  pollMulti: false,
  cloudMaxAnswers: 3,
  cloudMaxLength: 20,
  ratingScale: "5",
  lowLabel: "",
  highLabel: "",
  textMaxLength: 200,
  allowAnonymous: true,
  multipleSubmissions: false,
};
describe.each(["poll", "multiple_choice"] as const)(
  "%s text limits",
  (type) => {
    it.each([400, 401])(
      "validates %i characters in editor and REST",
      (length) => {
        const valid = {
          type,
          title: "Question",
          options: [
            { title: "Yes", isCorrect: true },
            { title: "No", isCorrect: false },
          ],
        };
        for (const value of [
          { ...valid, title: "a".repeat(length) },
          {
            ...valid,
            options: [
              { title: "a".repeat(length), isCorrect: true },
              valid.options[1],
            ],
          },
        ]) {
          expect(questionDefinitionSchema.safeParse(value).success).toBe(
            length <= 400,
          );
          expect(
            addQuestionSchema.safeParse({ ...form, ...value }).success,
          ).toBe(length <= 400);
        }
      },
    );
  },
);
