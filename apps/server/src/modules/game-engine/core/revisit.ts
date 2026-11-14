import type { LiveQuestion } from "../game-engine.types";
export function playableQuestion(
  question: LiveQuestion,
  reopened?: boolean,
): LiveQuestion {
  if (
    reopened &&
    (question.type === "word_cloud" || question.type === "open_text")
  )
    return {
      ...question,
      config: { ...question.config, multipleSubmissions: true },
    } as LiveQuestion;
  return question;
}
