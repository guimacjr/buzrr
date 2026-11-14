import { describe, expect, it, vi } from "vitest";
import { GameEngineService } from "../game-engine.service";
import type { GameStoreService } from "../game-store.service";
import type { PrismaService } from "../../../prisma/prisma.service";
import type { DuelBotService } from "../duel-bot.service";
import type { TypedServer } from "../../realtime/realtime.types";
import type { LiveQuestion } from "../game-engine.types";
import { meta, player, question } from "../core/__tests__/fixtures";
import { MemoryStore, FakeServer, CODE } from "./fakes";

function setup(first: LiveQuestion) {
  const store = new MemoryStore(
    meta({
      phase: "question",
      qIndex: 1,
      qCount: 2,
      qId: "next",
      qStartAt: Date.now(),
      qDeadline: Date.now() + 10000,
    }),
    [player("p1"), player("p2")],
    [first, question("next")],
  );
  const io = new FakeServer();
  const engine = new GameEngineService(
    store as unknown as GameStoreService,
    {} as PrismaService,
    { cancel: vi.fn() } as unknown as DuelBotService,
  );
  engine.setServer(io as unknown as TypedServer);
  store.scores.set("p1", 900);
  return { store, engine, io };
}

describe("history navigation shell", () => {
  it("replaces a poll vote, keeps one respondent and rejects stale visit answers", async () => {
    const poll: LiveQuestion = {
      ...question("poll"),
      type: "poll",
      config: { multiSelect: false },
    };
    const { store, engine, io } = setup(poll);
    const saved = {
      answer: { optionIds: ["poll-a"] },
      score: 0,
      isCorrect: false,
      answeredAt: 1,
      timeTakenMs: 1,
    };
    store.answers.set(0, new Map([["p1", saved]]));
    try {
      expect(await engine.hostBack(CODE, 0)).toBe(true);
      expect(io.events("state-sync")).toHaveLength(3);
      expect(io.events("state-sync")[1]?.payload).toMatchObject({
        qIndex: 0,
        revision: 1,
        you: { answered: true, answer: saved.answer },
        question: { reopened: true },
      });
      expect(
        await engine.submitAnswer(CODE, "p1", 0, { optionIds: ["poll-b"] }, 0),
      ).toMatchObject({ accepted: false });
      expect(
        await engine.submitAnswer(CODE, "p1", 0, { optionIds: ["poll-b"] }, 1),
      ).toMatchObject({ accepted: true });
      expect(store.answers.get(0)?.size).toBe(1);
      expect(store.answers.get(0)?.get("p1")?.answer).toEqual({
        optionIds: ["poll-b"],
      });
      expect(store.scores.get("p1")).toBe(900);
      expect(await engine.hostBack(CODE, 0)).toBe(false);
    } finally {
      engine.onApplicationShutdown();
    }
  });

  it.each(["word_cloud", "open_text"] as const)(
    "appends %s answers even if originally single submission",
    async (type) => {
      const first: LiveQuestion =
        type === "word_cloud"
          ? {
              ...question("q"),
              type,
              options: [],
              config: {
                maxAnswers: 1,
                maxLength: 20,
                multipleSubmissions: false,
              },
            }
          : {
              ...question("q"),
              type,
              options: [],
              config: {
                maxLength: 200,
                allowAnonymous: true,
                multipleSubmissions: false,
              },
            };
      const { engine, store } = setup(first);
      try {
        await engine.hostBack(CODE, 0);
        const inputs =
          type === "word_cloud"
            ? [{ words: ["one"] }, { words: ["two"] }]
            : [
                { text: "one", anonymous: false },
                { text: "two", anonymous: true },
              ];
        for (const input of inputs)
          expect(
            await engine.submitAnswer(CODE, "p1", 0, input, 1),
          ).toMatchObject({ accepted: true });
        expect(store.answers.get(0)?.get("p1")?.answer).toEqual(
          type === "word_cloud"
            ? { words: ["one", "two"] }
            : {
                entries: [
                  { text: "one", anonymous: false },
                  { text: "two", anonymous: true },
                ],
              },
        );
        expect(store.scores.get("p1")).toBe(900);
        await engine.hostNext(CODE); // reveal
        await engine.hostNext(CODE); // already-visited scored item: reveal only
        expect(store.meta).toMatchObject({
          phase: "reveal",
          qIndex: 1,
          revision: 2,
        });
        expect(
          await engine.submitAnswer(CODE, "p1", 1, { optionId: "next-a" }, 2),
        ).toMatchObject({ accepted: false });
      } finally {
        engine.onApplicationShutdown();
      }
    },
  );
});
