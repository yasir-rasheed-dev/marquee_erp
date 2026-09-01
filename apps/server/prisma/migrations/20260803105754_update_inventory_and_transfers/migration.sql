/*
  Warnings:

  - The values [purchase,sale,adjustment,transfer_in,transfer_out,waste,return] on the enum `StockTransactionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StockTransactionType_new" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'WASTAGE');
ALTER TABLE "stock_transactions" ALTER COLUMN "type" TYPE "StockTransactionType_new" USING ("type"::text::"StockTransactionType_new");
ALTER TYPE "StockTransactionType" RENAME TO "StockTransactionType_old";
ALTER TYPE "StockTransactionType_new" RENAME TO "StockTransactionType";
DROP TYPE "StockTransactionType_old";
COMMIT;

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" SERIAL NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "fromBranchId" INTEGER NOT NULL,
    "toBranchId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "companyId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
