-- CreateTable
CREATE TABLE "processed_events" (
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "imported_repository_projections" (
    "repository_id" UUID NOT NULL,
    "github_repository_id" TEXT NOT NULL,
    "last_imported_at" TIMESTAMPTZ(3) NOT NULL,
    "last_correlation_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "imported_repository_projections_pkey" PRIMARY KEY ("repository_id")
);

-- CreateIndex
CREATE INDEX "processed_events_processed_at_idx" ON "processed_events"("processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "imported_repository_projections_github_repository_id_key" ON "imported_repository_projections"("github_repository_id");
