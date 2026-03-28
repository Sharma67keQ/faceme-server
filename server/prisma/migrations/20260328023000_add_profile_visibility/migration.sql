CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'FRIENDS');

ALTER TABLE "User"
  ADD COLUMN "profileVisibility" "ProfileVisibility";

UPDATE "User"
SET "profileVisibility" = CASE
  WHEN "isPrivateAccount" = true THEN 'FOLLOWERS'::"ProfileVisibility"
  ELSE 'PUBLIC'::"ProfileVisibility"
END
WHERE "profileVisibility" IS NULL;

ALTER TABLE "User"
  ALTER COLUMN "profileVisibility" SET DEFAULT 'PUBLIC',
  ALTER COLUMN "profileVisibility" SET NOT NULL;
