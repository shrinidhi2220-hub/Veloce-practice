-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'CUSTOMER';

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
