import { mediaSlide } from "@buzrr/contract";
import type { QuestionTypeHandler } from "../question-type";
import { checkNoOptions, parseConfig } from "./shared";

/** Host-controlled presentation item: no submissions, scoring or duel entry. */
export const mediaSlideHandler: QuestionTypeHandler<"media_slide"> = {
  type: "media_slide",
  scored: false,
  validateDefinition({ options, config }) {
    return {
      options: checkNoOptions(options, "media slide"),
      config: parseConfig(mediaSlide.config, config, "media slide"),
    };
  },
  checkAnswer: () => null,
  score: () => 0,
  toPublic: (q) => ({
    type: "media_slide",
    id: q.id,
    title: q.title,
    media: q.media,
    mediaType: q.mediaType,
    timeOut: q.timeOut,
    fullScreen: q.config.fullScreen,
  }),
  summarize: () => ({ type: "media_slide", responses: 0 }),
  duelEligible: () => false,
  sampleAnswer() {
    throw new Error("Media slides cannot be played by bots");
  },
};
