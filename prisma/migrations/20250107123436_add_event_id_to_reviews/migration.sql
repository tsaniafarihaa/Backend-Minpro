-- AlterTable
ALTER TABLE "Reviews" ADD COLUMN     "eventId" INTEGER;

-- AlterTable
ALTER TABLE "UserCoupon" ALTER COLUMN "isRedeem" SET DEFAULT false;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
