-- AlterTable
ALTER TABLE "migration_probe" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "githubUserId" BIGINT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_installations" (
    "id" UUID NOT NULL,
    "githubInstallationId" BIGINT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "github_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" UUID NOT NULL,
    "githubRepositoryId" BIGINT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "license" TEXT,
    "defaultBranch" TEXT NOT NULL,
    "openIssuesCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_access" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repository_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_documents" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "repository_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "githubIssueId" BIGINT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "state" TEXT NOT NULL,
    "author" TEXT,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "closedAt" TIMESTAMPTZ(3),

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_labels" (
    "id" UUID NOT NULL,
    "issueId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "issue_labels_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "users_githubUserId_key" ON "users"("githubUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "github_installations_githubInstallationId_key" ON "github_installations"("githubInstallationId");

-- CreateIndex
CREATE UNIQUE INDEX "github_installations_accountType_accountLogin_key" ON "github_installations"("accountType", "accountLogin");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_githubRepositoryId_key" ON "repositories"("githubRepositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_fullName_key" ON "repositories"("fullName");

-- CreateIndex
CREATE INDEX "repositories_owner_name_idx" ON "repositories"("owner", "name");

-- CreateIndex
CREATE INDEX "repositories_lastSyncedAt_idx" ON "repositories"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "repository_access_userId_repositoryId_idx" ON "repository_access"("userId", "repositoryId");

-- CreateIndex
CREATE INDEX "repository_access_repositoryId_userId_idx" ON "repository_access"("repositoryId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "repository_access_userId_repositoryId_key" ON "repository_access"("userId", "repositoryId");

-- CreateIndex
CREATE INDEX "repository_documents_repositoryId_documentType_idx" ON "repository_documents"("repositoryId", "documentType");

-- CreateIndex
CREATE INDEX "repository_documents_repositoryId_sha_idx" ON "repository_documents"("repositoryId", "sha");

-- CreateIndex
CREATE UNIQUE INDEX "repository_documents_repositoryId_path_key" ON "repository_documents"("repositoryId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "issues_githubIssueId_key" ON "issues"("githubIssueId");

-- CreateIndex
CREATE INDEX "issues_repositoryId_state_idx" ON "issues"("repositoryId", "state");

-- CreateIndex
CREATE INDEX "issues_repositoryId_number_idx" ON "issues"("repositoryId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "issues_repositoryId_number_key" ON "issues"("repositoryId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "issue_labels_issueId_name_key" ON "issue_labels"("issueId", "name");

-- CreateIndex
CREATE INDEX "recommendations_repositoryId_score_idx" ON "recommendations"("repositoryId", "score");

-- CreateIndex
CREATE INDEX "recommendations_issueId_idx" ON "recommendations"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_repositoryId_rank_key" ON "recommendations"("repositoryId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_repositoryId_issueId_key" ON "recommendations"("repositoryId", "issueId");

-- AddForeignKey
ALTER TABLE "repository_access" ADD CONSTRAINT "repository_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_access" ADD CONSTRAINT "repository_access_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_documents" ADD CONSTRAINT "repository_documents_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
