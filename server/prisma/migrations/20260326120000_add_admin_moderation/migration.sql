ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'REEL';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'STATUS';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'GROUP';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'PAGE';

CREATE TYPE "ModerationActionType" AS ENUM (
  'REPORT_STATUS_UPDATED',
  'CONTENT_HIDDEN',
  'CONTENT_RESTORED',
  'MEDIA_REMOVED',
  'USER_SUSPENDED',
  'USER_UNSUSPENDED',
  'USER_BANNED',
  'USER_UNBANNED',
  'GROUP_HIDDEN',
  'GROUP_RESTORED',
  'PAGE_HIDDEN',
  'PAGE_RESTORED'
);

ALTER TABLE "User"
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" VARCHAR(500),
  ADD COLUMN "bannedAt" TIMESTAMP(3),
  ADD COLUMN "banReason" VARCHAR(500);

ALTER TABLE "Page"
  ADD COLUMN "hiddenAt" TIMESTAMP(3),
  ADD COLUMN "hiddenReason" VARCHAR(500);

ALTER TABLE "Group"
  ADD COLUMN "hiddenAt" TIMESTAMP(3),
  ADD COLUMN "hiddenReason" VARCHAR(500);

ALTER TABLE "Post"
  ADD COLUMN "hiddenAt" TIMESTAMP(3),
  ADD COLUMN "hiddenReason" VARCHAR(500);

ALTER TABLE "Status"
  ADD COLUMN "hiddenAt" TIMESTAMP(3),
  ADD COLUMN "hiddenReason" VARCHAR(500);

ALTER TABLE "Reel"
  ADD COLUMN "hiddenAt" TIMESTAMP(3),
  ADD COLUMN "hiddenReason" VARCHAR(500);

ALTER TABLE "PostComment"
  ADD COLUMN "hiddenAt" TIMESTAMP(3),
  ADD COLUMN "hiddenReason" VARCHAR(500);

ALTER TABLE "Report"
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "resolutionNotes" VARCHAR(500);

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ModerationLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "reportId" TEXT,
  "action" "ModerationActionType" NOT NULL,
  "targetType" "ReportTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" VARCHAR(500),
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ModerationLog"
  ADD CONSTRAINT "ModerationLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationLog"
  ADD CONSTRAINT "ModerationLog_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");
CREATE INDEX "ModerationLog_actorId_createdAt_idx" ON "ModerationLog"("actorId", "createdAt");
CREATE INDEX "ModerationLog_targetType_targetId_createdAt_idx" ON "ModerationLog"("targetType", "targetId", "createdAt");
