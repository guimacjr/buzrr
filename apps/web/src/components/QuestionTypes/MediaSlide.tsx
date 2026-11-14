"use client";
import type { QuestionRenderer } from "./types";

export const mediaSlideRenderer: QuestionRenderer<"media_slide"> = {
  AnswerInput: () => <p>Aguardando a próxima pergunta</p>,
  HostPrompt: () => null,
  RevealBreakdown: () => null,
  revealStats: () => ({ responses: 0, correct: 0 }),
  describeAnswer: () => null,
  correctAnswers: () => [],
};
