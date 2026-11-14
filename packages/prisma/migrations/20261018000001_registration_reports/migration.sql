-- Snapshot registration definitions per room and preserve participant data until final reporting.
ALTER TABLE "Quiz" ADD COLUMN "registrationFields" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "GameSession" ADD COLUMN "registrationFields" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "GameResult" ADD COLUMN "report" JSONB;
CREATE TABLE "GameRegistration" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "playerName" TEXT NOT NULL,
  "answers" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "GameRegistration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GameRegistration_sessionId_playerId_key" ON "GameRegistration"("sessionId", "playerId");
ALTER TABLE "GameRegistration" ADD CONSTRAINT "GameRegistration_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
