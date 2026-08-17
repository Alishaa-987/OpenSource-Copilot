-- CreateTable
CREATE TABLE "issue_intelligence" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "issueId" UUID NOT NULL,
    "mappingJson" JSONB NOT NULL,
    "analysisJson" JSONB NOT NULL,
    "sourceVersion" TEXT NOT NULL DEFAULT 'phase3-v1',
    "generatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "issue_intelligence_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "issue_intelligence_repositoryId_issueId_key" ON "issue_intelligence"("repositoryId", "issueId");
CREATE INDEX "issue_intelligence_repositoryId_updatedAt_idx" ON "issue_intelligence"("repositoryId", "updatedAt");
CREATE INDEX "issue_intelligence_issueId_idx" ON "issue_intelligence"("issueId");
