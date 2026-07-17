-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "PushSubscription" DROP CONSTRAINT "PushSubscription_userId_fkey";

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Database-level guards the schema layer (Zod) cannot enforce against a seed
-- script, psql, or Prisma Studio.

-- Capacity and price cannot be negative.
ALTER TABLE "Event" ADD CONSTRAINT "Event_capacityMen_nonneg" CHECK ("capacityMen" >= 0);
ALTER TABLE "Event" ADD CONSTRAINT "Event_capacityWomen_nonneg" CHECK ("capacityWomen" >= 0);
ALTER TABLE "Event" ADD CONSTRAINT "Event_priceCents_nonneg" CHECK ("priceCents" >= 0);

-- An event must end after it starts.
ALTER TABLE "Event" ADD CONSTRAINT "Event_ends_after_starts" CHECK ("endsAt" > "startsAt");

-- A ticket's snapshot price, when present, cannot be negative.
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_priceCents_nonneg" CHECK ("priceCents" IS NULL OR "priceCents" >= 0);

-- Match pairs are stored canonically (userAId < userBId, see pairKey in
-- src/lib/domain/matching.ts). Enforcing it in the DB makes the
-- @@unique([sessionId, userAId, userBId]) index meaningful — without it (A,B)
-- and (B,A) would be two distinct rows — and blocks a self-match (A,A).
ALTER TABLE "Match" ADD CONSTRAINT "Match_canonical_order" CHECK ("userAId" < "userBId");
