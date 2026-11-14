import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import { afterAll, describe, expect, it } from "vitest";
import { GameStoreService } from "../game-store.service";
import { answer, meta, player } from "../core/__tests__/fixtures";
const url = process.env.REDIS_TEST_URL;
describe.skipIf(!url)("navigation atomicity (Redis DB 15)", () => {
  const redis = new Redis(url ?? "", {
    db: 15,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  const store = new GameStoreService(redis);
  const codes: string[] = [];
  afterAll(async () => {
    for (const code of codes) await store.deleteGame(code, 3);
    redis.disconnect();
  });
  it("allows one competing transition and rejects stale writes", async () => {
    const code = `nav-${randomUUID()}`;
    codes.push(code);
    const initial = meta({ phase: "question", qIndex: 1, revision: 0 });
    await store.initMeta(code, initial);
    await store.upsertPlayer(code, player("p1"));
    const attempts = await Promise.all([
      store.commitTransition(
        code,
        initial,
        { qIndex: 0, revision: 1, reopened: true },
        Date.now() + 10000,
      ),
      store.commitTransition(
        code,
        initial,
        { qIndex: 0, revision: 1, reopened: true },
        Date.now() + 10000,
      ),
    ]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
    expect(
      await store.recordAnswer(code, 1, "p1", answer("q1-a"), 0),
    ).toBeNull();
    const stored = { ...answer("q0-a"), score: 0, isCorrect: false };
    expect(await store.recordAnswer(code, 0, "p1", stored, 1)).toEqual(["p1"]);
    const raw = await store.getAnswerRaw(code, 0, "p1");
    const current = (await store.getMeta(code))!;
    await store.commitTransition(
      code,
      current,
      { phase: "reveal" },
      Date.now() + 10000,
    );
    expect(await store.replaceAnswer(code, 0, "p1", raw!, stored, 1)).toBe(
      false,
    );
    expect(await store.recordAnswer(code, 0, "p1", stored, 1)).toBeNull();
    expect(await store.getAnswerRaw(code, 0, "p1")).toBe(raw);
    expect((await store.getMeta(code))?.reopened).toBe(true);
    expect(await store.claimEnded(code, current)).toBe(false);
    expect(await store.claimEnded(code, (await store.getMeta(code))!)).toBe(
      true,
    );
  });
});
