import type {
  QuestionAnswer,
  SessionReport,
  RegistrationField,
  RegistrationAnswers,
} from "@buzrr/contract";
import type { LiveQuestion, StoredAnswer } from "./game-engine.types";

export function answerText(q: LiveQuestion, answer: QuestionAnswer): string {
  const option = (id: string) =>
    q.options.find((o) => o.id === id)?.title ?? id;
  if ("optionId" in answer) return option(answer.optionId);
  if ("optionIds" in answer) return answer.optionIds.map(option).join(" | ");
  if ("value" in answer) return String(answer.value);
  if ("words" in answer) return answer.words.join(" | ");
  if ("text" in answer)
    return answer.anonymous ? "[Anonymous response]" : answer.text;
  return answer.entries
    .map((e) => (e.anonymous ? "[Anonymous response]" : e.text))
    .join(" | ");
}
export function buildSessionReport(
  fields: RegistrationField[],
  players: {
    id: string;
    name: string;
    registrationAnswers: RegistrationAnswers;
  }[],
  questions: LiveQuestion[],
  answers: Record<string, StoredAnswer>[],
  lastPresented: number,
): SessionReport {
  return {
    version: 1,
    fields,
    questions: questions.map((q) => ({
      id: q.id,
      title: q.title,
      type: q.type,
    })),
    players: players.map((p) => ({
      ...p,
      responses: questions.map((q, i) => {
        const a = answers[i]?.[p.id];
        const scored = q.type === "multiple_choice" || q.type === "true_false";
        return {
          questionId: q.id,
          answer: a ? answerText(q, a.answer) : null,
          status:
            i > lastPresented
              ? "not_presented"
              : q.type === "media_slide"
                ? "media_slide"
                : a
                  ? "answered"
                  : "unanswered",
          correct: a && scored ? a.isCorrect : null,
          score: a?.score ?? 0,
          timeTakenMs: a?.timeTakenMs ?? null,
        };
      }),
    })),
  };
}
