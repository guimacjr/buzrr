import { describe, expect, it } from "vitest";
import { step } from "../machine";
import { buildSnapshot } from "../views";
import { judgeAnswer } from "../answers";
import {
  checkAnswer,
  isDuelEligible,
  toLiveQuestion,
  validateDefinition,
} from "../../../question-types";
import type { LiveQuestion } from "../../game-engine.types";
import {
  T0,
  answer,
  emitted,
  kinds,
  meta,
  question,
  questionOpen,
  state,
} from "./fixtures";

const slide: LiveQuestion<"media_slide"> = {
  ...question("slide"),
  type: "media_slide",
  options: [],
  config: {},
  media: "http://localhost:3001/uploads/slide.mp4",
  mediaType: "video",
};

describe("media slides", () => {
  it("preserves fullscreen through validation, loading and reconnect snapshots", () => {
    const authored = { ...slide, config: { fullScreen: true } };
    expect(validateDefinition("media_slide", authored).config).toMatchObject({
      fullScreen: true,
    });
    const loaded = toLiveQuestion(authored)!;
    expect(loaded.config).toMatchObject({ fullScreen: true });
    const snapshot = buildSnapshot(
      questionOpen({ questions: [loaded] }, { qDeadline: 0 }),
      "p1",
      T0,
    );
    expect(snapshot.question).toMatchObject({
      type: "media_slide",
      fullScreen: true,
    });
    expect(validateDefinition("media_slide", slide).config).not.toHaveProperty(
      "fullScreen",
    );
    expect(() =>
      validateDefinition("media_slide", {
        ...slide,
        config: { fullScreen: "yes" },
      }),
    ).toThrow();
  });
  it("parks its deadline and waits through timers, answers and roster changes", () => {
    const opened = step(
      state({
        questions: [slide, question("q2")],
        meta: meta({ phase: "starting", qCount: 2 }),
      }),
      { type: "deadline" },
      T0,
    );
    expect(opened.state.meta).toMatchObject({
      phase: "question",
      qDeadline: 0,
    });
    expect(kinds(opened.effects)).toContain("park-deadline");
    expect(kinds(opened.effects)).not.toContain("arm-timer");
    for (const event of [
      { type: "deadline" } as const,
      { type: "roster-changed" } as const,
      { type: "answer-recorded", qIndex: 0, answered: ["p1", "p2"] } as const,
      { type: "close-question", qIndex: 0 } as const,
    ]) {
      const next = step(opened.state, event, T0 + 100000);
      expect(next.state.meta.phase).toBe("question");
      expect(emitted(next.effects)).toEqual([]);
    }
    expect(
      judgeAnswer(
        opened.state,
        { playerId: "p1", qIndex: 0, answer: { value: true } },
        T0 + 1,
      ).accepted,
    ).toBe(false);
    const snapshot = buildSnapshot(opened.state, "p1", T0 + 100000);
    expect(snapshot.question?.type).toBe("media_slide");
    expect(snapshot.remainingMs).toBe(0);
    expect(snapshot.reveal).toBeUndefined();
    const next = step(opened.state, { type: "host-next" }, T0 + 100000);
    expect(next.state.meta).toMatchObject({ phase: "question", qIndex: 1 });
    expect(emitted(next.effects).map((e) => e.event)).toEqual([
      "question-start",
    ]);
  });

  it("goes directly to the final ranking when the last item is a slide", () => {
    const s = questionOpen(
      { questions: [slide], scores: [{ playerId: "p1", score: 750 }] },
      { qDeadline: 0 },
    );
    const result = step(s, { type: "host-next" }, T0);
    expect(result.state.meta.phase).toBe("final");
    expect(result.state.scores).toEqual(s.scores);
    expect(emitted(result.effects).map((e) => e.event)).toEqual([
      "leaderboard",
    ]);
    expect(buildSnapshot(result.state, "p1", T0).leaderboard?.[0]?.score).toBe(
      750,
    );
  });

  it("rejects answers, authored options and duel eligibility", () => {
    expect(checkAnswer(slide, { value: true })).toBeNull();
    expect(isDuelEligible("media_slide", { options: [], config: {} })).toBe(
      false,
    );
    expect(() =>
      validateDefinition("media_slide", {
        options: [{ title: "a", isCorrect: true }],
        config: {},
      }),
    ).toThrow();
  });
});

describe("optional per-question ranking", () => {
  it("preserves authored settings through validation and database conversion", () => {
    const q = { ...question("q1"), config: { showRanking: false } };
    expect(validateDefinition(q.type, q).config.showRanking).toBe(false);
    expect(toLiveQuestion(q)?.config.showRanking).toBe(false);
    expect(() =>
      validateDefinition(q.type, { ...q, config: { showRanking: "no" } }),
    ).toThrow();
  });

  it("keeps percentages and points, hides live/reconnect standings, and restores final ranking", () => {
    const q = { ...question("q1"), config: { showRanking: false } };
    const s = questionOpen({
      questions: [q],
      answers: { p1: answer("q1-a", { score: 900, isCorrect: true }) },
      scores: [{ playerId: "p1", score: 900 }],
    });
    const result = step(s, { type: "host-next" }, T0 + 1000);
    expect(result.state.scores).toEqual(s.scores);
    expect(emitted(result.effects).some((e) => e.event === "leaderboard")).toBe(
      false,
    );
    expect(
      emitted(result.effects).some((e) => e.event === "question-end"),
    ).toBe(true);
    const snapshot = buildSnapshot(result.state, "p1", T0);
    expect(snapshot.question?.showRanking).toBe(false);
    expect(snapshot.leaderboard).toBeUndefined();
    expect(snapshot.reveal?.summary).toMatchObject({
      responses: 1,
      counts: [1, 0, 0, 0],
    });
    expect(snapshot.you?.totalScore).toBe(900);
    expect(
      emitted(step(result.state, { type: "roster-changed" }, T0).effects),
    ).toEqual([]);
    const final = step(result.state, { type: "host-next" }, T0);
    expect(buildSnapshot(final.state, "p1", T0).leaderboard?.[0]?.score).toBe(
      900,
    );
  });
});

describe("quiz final ranking setting", () => {
  it.each(["reveal", "question"] as const)(
    "ends without broadcasting standings from %s",
    (phase) => {
      const last = phase === "question" ? slide : question("q1");
      const initial = questionOpen(
        { questions: [last] },
        { phase, qCount: 1, showFinalRanking: false },
      );
      const result = step(initial, { type: "host-next" }, T0);
      expect(result.state.meta.phase).toBe("final");
      expect(kinds(result.effects)).toContain("end-game");
      expect(result.effects).toContainEqual({ kind: "set-deadline", at: 0 });
      expect(emitted(result.effects)).toEqual([]);
      const snapshot = buildSnapshot(result.state, "p1", T0);
      expect(snapshot.showFinalRanking).toBe(false);
      expect(snapshot.leaderboard).toBeUndefined();
      expect(
        kinds(step(result.state, { type: "deadline" }, T0).effects),
      ).toContain("end-game");
      expect(
        emitted(step(result.state, { type: "roster-changed" }, T0).effects),
      ).toEqual([]);
    },
  );

  it("snapshots the quiz setting at start and defaults existing quizzes to visible", () => {
    for (const showFinalRanking of [undefined, true, false]) {
      const started = step(
        state({ meta: meta({ phase: "lobby" }) }),
        {
          type: "start",
          questions: [slide],
          quizTitle: "Quiz",
          showFinalRanking,
        },
        T0,
      );
      expect(started.state.meta.showFinalRanking).toBe(
        showFinalRanking ?? true,
      );
    }
  });
});
