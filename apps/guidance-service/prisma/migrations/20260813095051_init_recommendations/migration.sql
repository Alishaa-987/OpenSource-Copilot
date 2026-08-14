-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "issueId" UUID,
    "score" DECIMAL(12,6) NOT NULL,
    "rank" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendations_repositoryId_score_idx" ON "recommendations"("repositoryId", "score");

-- CreateIndex
CREATE INDEX "recommendations_issueId_idx" ON "recommendations"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_repositoryId_rank_key" ON "recommendations"("repositoryId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_repositoryId_issueId_key" ON "recommendations"("repositoryId", "issueId");
