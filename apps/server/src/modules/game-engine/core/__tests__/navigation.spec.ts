import { describe, expect, it } from "vitest";
import { step } from "../machine";
import { buildSnapshot } from "../views";
import { judgeAnswer } from "../answers";
import type { LiveQuestion } from "../../game-engine.types";
import { T0, question, questionOpen, answer, kinds } from "./fixtures";

const poll: LiveQuestion = {
  ...question("poll"),
  type: "poll",
  config: { multiSelect: false },
};
const slide: LiveQuestion = {
  ...question("slide"),
  type: "media_slide",
  options: [],
  config: {},
};
const back = { type: "host-back", revision: 0 } as const;

describe("classic history navigation", () => {
  it("shows a scored result without reopening or rescoring it", () => {
    const answers = { p1: answer("q0-a") };
    const initial = questionOpen(
      {
        questions: [question("q0"), question("q1")],
        answers,
        scores: [{ playerId: "p1", score: 900 }],
      },
      {},
      1,
    );
    const result = step(initial, back, T0 + 100);
    expect(result.state.meta).toMatchObject({
      qIndex: 0,
      phase: "reveal",
      revision: 1,
      maxVisitedIndex: 1,
      reopened: false,
    });
    expect(result.state.scores).toEqual(initial.scores);
    expect(result.state.answers).toEqual(answers);
    expect(kinds(result.effects)).toContain("sync-all");
    expect(
      judgeAnswer(
        result.state,
        {
          playerId: "p1",
          qIndex: 0,
          revision: 1,
          answer: { optionId: "q0-a" },
        },
        T0 + 200,
      ).accepted,
    ).toBe(false);
    const snapshot = buildSnapshot(result.state, "p1", T0 + 100);
    expect(snapshot.reveal?.index).toBe(0);
    expect(snapshot.you?.answered).toBe(true);
    const next = step(result.state, { type: "host-next" }, T0 + 200);
    expect(next.state.meta).toMatchObject({
      qIndex: 1,
      phase: "reveal",
      revision: 2,
    });
  });

  it("reopens unscored questions with a fresh timer and keeps old responses", () => {
    const initial = questionOpen({ questions: [poll, slide] }, {}, 1);
    const result = step(initial, back, T0 + 100);
    expect(result.state.meta).toMatchObject({
      qIndex: 0,
      phase: "question",
      reopened: true,
      revision: 1,
      qStartAt: T0 + 100,
    });
    expect(buildSnapshot(result.state, "p1", T0 + 100).question).toMatchObject({
      reopened: true,
    });
    const input = {
      playerId: "p1",
      qIndex: 0,
      answer: { optionIds: ["poll-a"] },
    };
    expect(judgeAnswer(result.state, input, T0 + 200).accepted).toBe(false);
    expect(
      judgeAnswer(result.state, { ...input, revision: 1 }, T0 + 200).accepted,
    ).toBe(true);
    expect(
      kinds(
        step(
          result.state,
          { type: "answer-recorded", qIndex: 0, answered: ["p1", "p2"] },
          T0 + 200,
        ).effects,
      ),
    ).not.toContain("dispatch");
    expect(
      step(
        result.state,
        { type: "close-question", qIndex: 0, revision: 0 },
        T0 + 200,
      ).effects,
    ).toEqual([]);
  });

  it.each(["word_cloud", "open_text"] as const)(
    "enables extra submissions for revisited %s",
    (type) => {
      const q: LiveQuestion =
        type === "word_cloud"
          ? {
              ...question("words"),
              type,
              options: [],
              config: {
                maxAnswers: 1,
                maxLength: 20,
                multipleSubmissions: false,
              },
            }
          : {
              ...question("text"),
              type,
              options: [],
              config: {
                maxLength: 200,
                allowAnonymous: true,
                multipleSubmissions: false,
              },
            };
      const result = step(
        questionOpen({ questions: [q, slide] }, {}, 1),
        back,
        T0,
      );
      expect(buildSnapshot(result.state, "p1", T0).question).toMatchObject({
        multipleSubmissions: true,
        reopened: true,
      });
      expect(q.config).toMatchObject({ multipleSubmissions: false });
    },
  );

  it("returns to a media slide and from the final screen to the last item", () => {
    const result = step(
      questionOpen({ questions: [slide, poll] }, {}, 1),
      back,
      T0,
    );
    expect(result.state.meta).toMatchObject({
      qIndex: 0,
      phase: "question",
      qDeadline: 0,
    });
    expect(kinds(result.effects)).not.toContain("arm-timer");
    const final = step(
      questionOpen({ questions: [poll] }, { phase: "final" }),
      back,
      T0,
    );
    expect(final.state.meta).toMatchObject({
      qIndex: 0,
      phase: "question",
      reopened: true,
    });
  });

  it("rejects duels, stale clicks, the first item and ended games", () => {
    for (const initial of [
      questionOpen({}, {}, 0),
      questionOpen({}, { mode: "duel" }, 1),
      questionOpen({}, { revision: 1 }, 1),
      questionOpen({}, { phase: "ended" }, 1),
    ])
      expect(step(initial, back, T0).effects).toEqual([]);
  });
});
