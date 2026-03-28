CREATE TYPE "VoiceRoomPrivacy" AS ENUM ('PUBLIC', 'FOLLOWERS', 'FRIENDS', 'INVITE_ONLY');

CREATE TYPE "VoiceRoomStatus" AS ENUM ('LIVE', 'ENDED');

ALTER TABLE "VoiceRoom"
ADD COLUMN "description" VARCHAR(500),
ADD COLUMN "privacy" "VoiceRoomPrivacy" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "status" "VoiceRoomStatus" NOT NULL DEFAULT 'LIVE',
ADD COLUMN "endedAt" TIMESTAMP(3);

ALTER TABLE "VoiceParticipant"
ADD COLUMN "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER';
