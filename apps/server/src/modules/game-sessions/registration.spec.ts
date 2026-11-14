import { describe, expect, it, vi } from "vitest";
import {
  registrationFieldsSchema,
  validateRegistrationAnswers,
  type RegistrationField,
} from "@buzrr/contract";
import { GameSessionsService } from "./game-sessions.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { GameEngineService } from "../game-engine/game-engine.service";
import type { EntitlementsService } from "../billing/entitlements.service";
import { reportCsv } from "./report-csv";
import { buildSessionReport, answerText } from "../game-engine/report";
import { question, answer } from "../game-engine/core/__tests__/fixtures";

const fields: RegistrationField[] = [
  { id: "name", label: "Name", type: "text", required: true, options: [] },
  {
    id: "code",
    label: "Code",
    type: "alphanumeric",
    required: false,
    options: [],
  },
  {
    id: "agree",
    label: "Agree",
    type: "checkbox",
    required: true,
    options: [],
  },
  {
    id: "team",
    label: "Team",
    type: "dropdown",
    required: true,
    options: ["A", "B"],
  },
];
const valid = { name: " Alice ", agree: true, team: "A", code: "Á23" };
describe("registration validation", () => {
  it("validates all field types, trims text and discards undeclared keys", () => {
    expect(
      validateRegistrationAnswers(fields, { ...valid, injected: "secret" }),
    ).toEqual({ ...valid, name: "Alice" });
  });
  it.each([
    { ...valid, name: "  " },
    { ...valid, code: "A-2" },
    { ...valid, agree: false },
    { ...valid, agree: "true" },
    { ...valid, team: "X" },
    { ...valid, name: true },
  ])("rejects invalid or missing mandatory answers", (input) => {
    expect(() => validateRegistrationAnswers(fields, input)).toThrow();
  });
  it("allows optional empty fields and rejects duplicate definitions", () => {
    expect(
      validateRegistrationAnswers(
        fields.map((f) => ({ ...f, required: false })),
        {},
      ),
    ).toEqual({ name: "", code: "", agree: false, team: "" });
    expect(
      registrationFieldsSchema.safeParse([fields[0], fields[0]]).success,
    ).toBe(false);
    expect(
      registrationFieldsSchema.safeParse([{ ...fields[3], options: [] }])
        .success,
    ).toBe(false);
  });
});
function setup() {
  const db = {
    gameSession: {
      findUnique: vi.fn().mockResolvedValue({
        id: "room",
        gameCode: "ABC123",
        registrationFields: fields,
      }),
    },
    player: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: "p", name: "Alice", gameId: "room" }),
      update: vi.fn(),
    },
    gameRegistration: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
    },
    gameResult: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(
    async (fn: (tx: typeof db) => Promise<void>) => fn(db),
  );
  const service = new GameSessionsService(
    { db } as unknown as PrismaService,
    {
      isBanned: vi.fn().mockResolvedValue(false),
    } as unknown as GameEngineService,
    {} as EntitlementsService,
  );
  return { db, service };
}
describe("join and report authorization", () => {
  it("rejects invalid joins before changing membership", async () => {
    const { db, service } = setup();
    await expect(
      service.join("p", { gameCode: "ABC123", registrationAnswers: {} }),
    ).rejects.toThrow();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("writes entry data and membership together; rejoin preserves previous answers", async () => {
    const { db, service } = setup();
    db.gameRegistration.findUnique.mockResolvedValue({ answers: valid });
    await service.join("p", { gameCode: "ABC123" });
    expect(db.gameRegistration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          answers: { ...valid, name: "Alice" },
        }),
      }),
    );
    expect(db.player.update).toHaveBeenCalled();
  });
  it("blocks downloads by another host", async () => {
    const { db, service } = setup();
    db.gameResult.findUnique.mockResolvedValue({
      hostId: "owner",
      entries: [],
    });
    await expect(
      service.downloadReport({ userId: "intruder" }, "result"),
    ).rejects.toThrow("Unauthorized");
  });
});
describe("immutable detailed report", () => {
  it("retains removed participants, option text, missing answers and unpresented questions", () => {
    const q = question("q1");
    const report = buildSessionReport(
      fields,
      [
        { id: "removed", name: "Alice", registrationAnswers: valid },
        { id: "present", name: "Bob", registrationAnswers: {} },
      ],
      [q, question("q2")],
      [{ removed: answer("q1-a") }, {}],
      0,
    );
    expect(report.players[0]?.responses[0]?.answer).toBe(q.options[0]?.title);
    expect(report.players[1]?.responses[0]?.status).toBe("unanswered");
    expect(report.players[0]?.responses[1]?.status).toBe("not_presented");
    q.title = "Edited later";
    expect(report.questions[0]?.title).not.toBe(q.title);
  });
  it("keeps anonymous text anonymous and formats multiselect/word/rating answers", () => {
    const q = question("q");
    expect(answerText(q, { text: "secret", anonymous: true })).toBe(
      "[Anonymous response]",
    );
    expect(answerText(q, { optionIds: ["q-a", "q-b"] })).toBe(
      q.options
        .slice(0, 2)
        .map((o) => o.title)
        .join(" | "),
    );
    expect(answerText(q, { words: ["hello", "world"] })).toBe("hello | world");
    expect(answerText(q, { value: 4 })).toBe("4");
  });
  it("escapes CSV separators, quotes, line breaks, and formula injection; handles old sessions", () => {
    const csv = reportCsv(
      {
        quizTitle: '=HYPERLINK("bad")',
        gameCode: "ABC123",
        startedAt: new Date(0),
        endedAt: new Date(0),
        entries: [{ playerName: 'A,"B"\nC', score: 1, rank: 1 }],
      },
      null,
    );
    expect(csv.startsWith("\uFEFFsep=,\r\n")).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"A,""B""\nC"');
    expect(csv).toContain("Detailed responses were not recorded");
  });
});
