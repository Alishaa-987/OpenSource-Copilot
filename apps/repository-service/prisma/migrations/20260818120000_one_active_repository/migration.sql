ALTER TABLE "repository_access" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "repository_access_userId_isActive_idx" ON "repository_access"("userId", "isActive");
