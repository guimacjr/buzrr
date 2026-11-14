import { describe, expect, it, vi } from "vitest";
import { sessionReportSchema } from "@buzrr/contract";
import { GameEngineService } from "../game-engine.service";
import type { GameStoreService } from "../game-store.service";
import type { PrismaService } from "../../../prisma/prisma.service";
import type { DuelBotService } from "../duel-bot.service";
import type { TypedServer } from "../../realtime/realtime.types";
import { answer, meta, player, question } from "../core/__tests__/fixtures";
import { FakeServer } from "./fakes";

describe("classic final report persistence", () => {
  it.each([true, false])(
    "persists results when showFinalRanking is %s",
    async (showFinalRanking) => {
      const q = question("q1");
      const m = meta({
        sessionId: "room",
        showFinalRanking,
        startedAt: 1000,
        phase: "final",
        qCount: 1,
        qIndex: 0,
      });
      const order: string[] = [];
      const store = {
        getMeta: vi.fn().mockResolvedValue(m),
        clearDeadline: vi.fn(),
        claimEnded: vi.fn().mockResolvedValue(true),
        leaderboard: vi
          .fn()
          .mockResolvedValue([{ playerId: "p1", score: 900 }]),
        roster: vi.fn().mockResolvedValue([player("p1")]),
        getAnswers: vi
          .fn()
          .mockResolvedValue({ p1: answer("q1-a"), removed: answer("q1-b") }),
        loadState: vi.fn().mockResolvedValue({ questions: [q] }),
        deleteGame: vi.fn().mockImplementation(async () => {
          order.push("redis-deleted");
        }),
      };
      const create = vi.fn().mockImplementation(async () => {
        order.push("result-saved");
        return { id: "result" };
      });
      const db = {
        gameSession: {
          findUnique: vi.fn().mockResolvedValue({
            registrationFields: [
              {
                id: "team",
                label: "Team",
                type: "text",
                required: true,
                options: [],
              },
            ],
            registrations: [
              { playerId: "p1", playerName: "Alice", answers: { team: "A" } },
              {
                playerId: "removed",
                playerName: "Bob",
                answers: { team: "B" },
              },
            ],
          }),
          delete: vi.fn().mockImplementation(async () => {
            order.push("lobby-deleted");
          }),
        },
        gameResult: { create },
        player: { updateMany: vi.fn() },
        $transaction: vi
          .fn()
          .mockImplementation(async (ops: Promise<unknown>[]) =>
            Promise.all(ops),
          ),
      };
      const engine = new GameEngineService(
        store as unknown as GameStoreService,
        { db } as unknown as PrismaService,
        { cancel: vi.fn() } as unknown as DuelBotService,
      );
      const io = new FakeServer();
      engine.setServer(io as unknown as TypedServer);
      await engine.endGame("ROOM01");
      expect(io.events("game-over")[0]?.payload).toMatchObject({
        showFinalRanking,
        ...(!showFinalRanking ? { entries: [] } : {}),
      });
      expect(io.events("game-session-ended")).toHaveLength(1);
      const report = sessionReportSchema.parse(
        create.mock.calls[0]?.[0].data.report,
      );
      expect(report.players).toHaveLength(2);
      expect(report.players[1]?.registrationAnswers).toEqual({ team: "B" });
      expect(report.players[1]?.responses[0]?.answer).toBe(q.options[1]?.title);
      expect(order).toEqual(["result-saved", "lobby-deleted", "redis-deleted"]);
      engine.onApplicationShutdown();
    },
  );
});
