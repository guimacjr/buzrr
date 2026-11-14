-- Empty storage falls back to bundled palettes and logo.
CREATE TABLE "BrandingSettings" (
  "id" TEXT NOT NULL,
  "light" JSONB NOT NULL,
  "dark" JSONB NOT NULL,
  "logoUrl" TEXT,
  CONSTRAINT "BrandingSettings_pkey" PRIMARY KEY ("id")
);
