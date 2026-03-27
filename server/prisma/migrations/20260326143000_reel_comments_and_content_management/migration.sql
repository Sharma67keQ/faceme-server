ALTER TABLE "Reel"
  ADD COLUMN "shareSlug" TEXT;

CREATE UNIQUE INDEX "Reel_shareSlug_key" ON "Reel"("shareSlug");

CREATE TABLE "ReelComment" (
  "id" TEXT NOT NULL,
  "reelId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" VARCHAR(600) NOT NULL,
  "parentCommentId" TEXT,
  "hiddenAt" TIMESTAMP(3),
  "hiddenReason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReelComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ReelComment"
  ADD CONSTRAINT "ReelComment_reelId_fkey"
  FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReelComment"
  ADD CONSTRAINT "ReelComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReelComment"
  ADD CONSTRAINT "ReelComment_parentCommentId_fkey"
  FOREIGN KEY ("parentCommentId") REFERENCES "ReelComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ReelComment_reelId_createdAt_idx" ON "ReelComment"("reelId", "createdAt");
CREATE INDEX "ReelComment_parentCommentId_createdAt_idx" ON "ReelComment"("parentCommentId", "createdAt");
