-- Empty catalog storage uses the bundled avatar definitions until first customization.
CREATE TABLE "AvatarCatalog" (
  "id" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AvatarCatalog_pkey" PRIMARY KEY ("id")
);
