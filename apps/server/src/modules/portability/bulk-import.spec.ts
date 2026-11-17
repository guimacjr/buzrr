import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { PortabilityService } from "./portability.service";
import { PortabilityController } from "./portability.controller";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import type { PrismaService } from "../../prisma/prisma.service";
import type { MediaStorage } from "../../common/storage/media-storage";
import type { EntitlementsService } from "../billing/entitlements.service";

function setup() {
  const findMany = vi.fn().mockResolvedValue([{ id: "one" }, { id: "two" }]);
  const service = new PortabilityService(
    { db: { user: { findMany } } } as unknown as PrismaService,
    {} as MediaStorage,
    {} as EntitlementsService,
  );
  return { service, findMany };
}
describe("bulk quiz distribution", () => {
  it("requires superadmin and rejects duplicate or malformed targets", () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        PortabilityController.prototype.importQuizBulk,
      ),
    ).toEqual(["superadmin"]);
    const { service } = setup();
    const controller = new PortabilityController(service);
    for (const targets of ['["one","one"]', "[]", "invalid"]) {
      expect(() =>
        controller.importQuizBulk({ userId: "actor" }, undefined, targets),
      ).toThrow();
    }
  });
  it("validates the ZIP before looking up or importing accounts", async () => {
    const { service, findMany } = setup();
    const importQuiz = vi.spyOn(service, "importQuiz");
    await expect(
      service.importQuizBulk(["one"], Buffer.from("invalid")),
    ).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();
    expect(importQuiz).not.toHaveBeenCalled();
  });
  it("imports as each owner, reports missing accounts and continues after plan refusal", async () => {
    const { service } = setup();
    vi.spyOn(service, "preview").mockReturnValue(
      {} as ReturnType<PortabilityService["preview"]>,
    );
    const importQuiz = vi
      .spyOn(service, "importQuiz")
      .mockRejectedValueOnce(new ForbiddenException("Quiz limit reached"))
      .mockResolvedValueOnce({ quizId: "copy-two" });
    const buffer = Buffer.from("validated");
    expect(
      await service.importQuizBulk(["one", "missing", "two"], buffer),
    ).toEqual([
      { userId: "one", error: "Quiz limit reached" },
      { userId: "missing", error: "Conta não encontrada." },
      { userId: "two", quizId: "copy-two" },
    ]);
    expect(importQuiz.mock.calls).toEqual([
      ["one", buffer],
      ["two", buffer],
    ]);
  });
});
