-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('GOOD', 'DAMAGED', 'UNDER_MAINTENANCE', 'DISPOSED');

-- CreateEnum
CREATE TYPE "AssetTransactionType" AS ENUM ('PURCHASE', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'DAMAGED_LOG', 'DISPOSAL');

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50),
    "category" VARCHAR(100) NOT NULL,
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalValuation" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_transactions" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "type" "AssetTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "branchId" INTEGER,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_assets_branchId_idx" ON "fixed_assets"("branchId");

-- CreateIndex
CREATE INDEX "fixed_assets_companyId_idx" ON "fixed_assets"("companyId");

-- CreateIndex
CREATE INDEX "fixed_assets_condition_idx" ON "fixed_assets"("condition");

-- CreateIndex
CREATE INDEX "fixed_assets_deletedAt_idx" ON "fixed_assets"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_code_companyId_key" ON "fixed_assets"("code", "companyId");

-- CreateIndex
CREATE INDEX "asset_transactions_assetId_idx" ON "asset_transactions"("assetId");

-- CreateIndex
CREATE INDEX "asset_transactions_branchId_idx" ON "asset_transactions"("branchId");

-- CreateIndex
CREATE INDEX "asset_transactions_companyId_idx" ON "asset_transactions"("companyId");

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transactions" ADD CONSTRAINT "asset_transactions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
