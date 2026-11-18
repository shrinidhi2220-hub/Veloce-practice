ALTER TABLE "User"
  ADD COLUMN "referralCode" TEXT,
  ADD COLUMN "referredById" TEXT;

CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

ALTER TABLE "User"
  ADD CONSTRAINT "User_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResaleListing"
  ADD COLUMN "buyerId" TEXT,
  ADD COLUMN "purchasedAt" TIMESTAMP(3);

ALTER TABLE "ResaleListing"
  ADD CONSTRAINT "ResaleListing_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ResalePurchase" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
  "shippingAddress" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResalePurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResalePurchase_listingId_key" ON "ResalePurchase"("listingId");
CREATE UNIQUE INDEX "ResalePurchase_orderNumber_key" ON "ResalePurchase"("orderNumber");
CREATE INDEX "ResalePurchase_buyerId_idx" ON "ResalePurchase"("buyerId");
CREATE INDEX "ResalePurchase_status_idx" ON "ResalePurchase"("status");

ALTER TABLE "ResalePurchase"
  ADD CONSTRAINT "ResalePurchase_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "ResaleListing"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResalePurchase"
  ADD CONSTRAINT "ResalePurchase_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
