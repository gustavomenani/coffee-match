-- Repairs baseline drift: `0_init` predates four schema changes that were
-- applied to local databases with `prisma db push` (which records no history).
-- Without this, `prisma migrate deploy` builds a database where every
-- authenticated request fails (the JWT callback selects User.tokenVersion).
--
-- Every statement is guarded so this is safe to apply BOTH to a fresh database
-- and to one already mutated by `db push`. Prisma migrations are not normally
-- idempotent; this one has to be, because existing databases already have
-- these objects and must still be able to record the migration as applied.

-- AlterTable: User.interests (ballot tags) + User.tokenVersion (JWT revocation)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: EventInterest.notifiedAt ("spot opened" e-mail dedup)
ALTER TABLE "EventInterest" ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP(3);

-- CreateTable: PushSubscription (one row per device/browser opted into Web Push)
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
