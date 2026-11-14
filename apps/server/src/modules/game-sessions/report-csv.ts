import type { SessionReport } from "@buzrr/contract";

/** Quote every cell, including headers; prevent spreadsheet formula execution. */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text))
    text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function reportCsv(
  result: {
    quizTitle: string;
    gameCode: string;
    startedAt: Date;
    endedAt: Date;
    entries: { playerName: string; score: number; rank: number }[];
  },
  report: SessionReport | null,
): string {
  const base = [
    "Quiz",
    "Room",
    "Started at",
    "Ended at",
    "Player ID",
    "Player",
  ];
  const context = [
    result.quizTitle,
    result.gameCode,
    result.startedAt.toISOString(),
    result.endedAt.toISOString(),
  ];
  let rows: unknown[][];
  if (!report) {
    rows = [
      [...base, "Score", "Rank", "Details"],
      ...result.entries.map((p) => [
        ...context,
        "",
        p.playerName,
        p.score,
        p.rank,
        "Detailed responses were not recorded for this session",
      ]),
    ];
  } else {
    rows = [
      [
        ...base,
        ...report.fields.map((f) => f.label),
        ...report.questions.flatMap((q, i) => [
          `Q${i + 1}: ${q.title} — answer`,
          `Q${i + 1} — status`,
          `Q${i + 1} — correct`,
          `Q${i + 1} — points`,
          `Q${i + 1} — time (ms)`,
        ]),
      ],
      ...report.players.map((p) => [
        ...context,
        p.id,
        p.name,
        ...report.fields.map((f) => p.registrationAnswers[f.id] ?? ""),
        ...report.questions.flatMap((q) => {
          const response = p.responses.find((a) => a.questionId === q.id);
          return [
            response?.answer,
            response?.status ?? "unanswered",
            response?.correct,
            response?.score ?? 0,
            response?.timeTakenMs,
          ];
        }),
      ]),
    ];
  }
  return (
    "\uFEFFsep=,\r\n" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
