/*
  Warnings:

  - A unique constraint covering the columns `[userId,action,reference]` on the table `RewardLedger` will be added. If there are existing duplicate values, this will fail.
  - Made the column `reference` on table `RewardLedger` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "RewardLedger" ALTER COLUMN "reference" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RewardLedger_userId_action_reference_key" ON "RewardLedger"("userId", "action", "reference");
