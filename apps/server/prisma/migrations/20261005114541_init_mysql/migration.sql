-- CreateTable
CREATE TABLE `companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `taxNumber` VARCHAR(255) NULL,
    `logo` LONGTEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `companies_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `timezone` VARCHAR(255) NOT NULL DEFAULT 'Asia/Karachi',
    `dateFormat` VARCHAR(255) NOT NULL DEFAULT 'DD/MM/YYYY',
    `timeFormat` VARCHAR(255) NOT NULL DEFAULT '12h',
    `currencyId` INTEGER NULL,
    `fiscalYearStart` VARCHAR(255) NULL,
    `invoicePrefix` VARCHAR(255) NOT NULL DEFAULT 'INV',
    `bookingPrefix` VARCHAR(255) NOT NULL DEFAULT 'BKG',
    `receiptPrefix` VARCHAR(255) NOT NULL DEFAULT 'RCP',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `branches_companyId_idx`(`companyId`),
    INDEX `branches_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branch_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branchId` INTEGER NOT NULL,
    `receiptFooter` TEXT NULL,
    `receiptHeader` TEXT NULL,
    `kitchenPrinterIp` VARCHAR(255) NULL,
    `receiptPrinterIp` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `branch_settings_branchId_key`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poNo` VARCHAR(50) NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ISSUED',
    `orderDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expectedDate` DATETIME(3) NULL,
    `subTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_orders_supplierId_idx`(`supplierId`),
    INDEX `purchase_orders_companyId_idx`(`companyId`),
    UNIQUE INDEX `purchase_orders_poNo_companyId_key`(`poNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `po_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseOrderId` INTEGER NOT NULL,
    `inventoryId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `po_items_purchaseOrderId_idx`(`purchaseOrderId`),
    INDEX `po_items_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NULL,
    `contactPerson` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `type` ENUM('LOCAL', 'WHOLESALE', 'IMPORTER', 'FARMER_VENDOR') NOT NULL DEFAULT 'WHOLESALE',
    `openingBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `currentBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `suppliers_companyId_idx`(`companyId`),
    INDEX `suppliers_branchId_idx`(`branchId`),
    INDEX `suppliers_phone_idx`(`phone`),
    UNIQUE INDEX `suppliers_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_ledgers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `balance` DECIMAL(12, 2) NOT NULL,
    `referenceId` INTEGER NULL,
    `referenceType` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `supplier_ledgers_supplierId_idx`(`supplierId`),
    INDEX `supplier_ledgers_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_bills` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `billNo` VARCHAR(50) NOT NULL,
    `purchaseOrderId` INTEGER NULL,
    `supplierId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paymentStatus` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `dueDate` DATETIME(3) NULL,
    `subTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `shippingCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `loadingCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `otherExpense` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `dueAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `vehicleNo` VARCHAR(50) NULL,
    `driverPhone` VARCHAR(20) NULL,
    `notes` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_bills_supplierId_idx`(`supplierId`),
    INDEX `purchase_bills_companyId_idx`(`companyId`),
    INDEX `purchase_bills_branchId_idx`(`branchId`),
    UNIQUE INDEX `purchase_bills_billNo_companyId_key`(`billNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_bill_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseBillId` INTEGER NOT NULL,
    `inventoryId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_bill_items_purchaseBillId_idx`(`purchaseBillId`),
    INDEX `purchase_bill_items_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseNo` VARCHAR(50) NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'SHIPPED', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paymentStatus` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `orderDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expectedDate` DATETIME(3) NULL,
    `receivedDate` DATETIME(3) NULL,
    `subTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `dueAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `vehicleNo` VARCHAR(50) NULL,
    `driverPhone` VARCHAR(20) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchases_supplierId_idx`(`supplierId`),
    INDEX `purchases_companyId_idx`(`companyId`),
    INDEX `purchases_branchId_idx`(`branchId`),
    INDEX `purchases_status_idx`(`status`),
    UNIQUE INDEX `purchases_purchaseNo_companyId_key`(`purchaseNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseId` INTEGER NOT NULL,
    `inventoryId` INTEGER NOT NULL,
    `orderedQty` DECIMAL(12, 3) NOT NULL,
    `receivedQty` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_items_purchaseId_idx`(`purchaseId`),
    INDEX `purchase_items_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnNo` VARCHAR(50) NOT NULL,
    `purchaseId` INTEGER NULL,
    `supplierId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `reason` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_returns_supplierId_idx`(`supplierId`),
    INDEX `purchase_returns_purchaseId_idx`(`purchaseId`),
    UNIQUE INDEX `purchase_returns_returnNo_companyId_key`(`returnNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_return_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnId` INTEGER NOT NULL,
    `inventoryId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_return_items_returnId_idx`(`returnId`),
    INDEX `purchase_return_items_inventoryId_idx`(`inventoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `currencies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(3) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `symbol` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `currencies_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_rates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tax_rates_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'staff',
    `phone` VARCHAR(255) NULL,
    `avatar` LONGTEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `googleDriveRefreshToken` TEXT NULL,
    `googleDriveAccessToken` TEXT NULL,
    `googleDriveTokenExpiry` DATETIME(3) NULL,
    `googleDriveEmail` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `users_email_idx`(`email`),
    INDEX `users_companyId_idx`(`companyId`),
    INDEX `users_branchId_idx`(`branchId`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `users_email_companyId_key`(`email`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `role` VARCHAR(255) NOT NULL DEFAULT 'staff',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `company_members_companyId_idx`(`companyId`),
    UNIQUE INDEX `company_members_userId_companyId_key`(`userId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NULL,
    `cnic` VARCHAR(20) NULL,
    `customerType` VARCHAR(255) NOT NULL DEFAULT 'individual',
    `businessName` VARCHAR(200) NULL,
    `businessType` VARCHAR(50) NULL,
    `ntn` VARCHAR(50) NULL,
    `strn` VARCHAR(50) NULL,
    `website` VARCHAR(100) NULL,
    `contactPersonName` VARCHAR(200) NULL,
    `contactPersonPhone` VARCHAR(20) NULL,
    `contactPersonDesignation` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `billingAddress` VARCHAR(300) NULL,
    `creditLimit` DECIMAL(12, 2) NULL,
    `paymentTerms` VARCHAR(20) NULL DEFAULT 'immediate',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `referralSource` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customers_companyId_idx`(`companyId`),
    INDEX `customers_branchId_idx`(`branchId`),
    INDEX `customers_phone_idx`(`phone`),
    INDEX `customers_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_emergency_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `relation` VARCHAR(50) NULL,
    `phone` VARCHAR(20) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_emergency_contacts_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NULL,
    `pricingType` VARCHAR(20) NOT NULL DEFAULT 'FIXED',
    `costPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `salePrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `minimumHours` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `services_companyId_idx`(`companyId`),
    INDEX `services_branchId_idx`(`branchId`),
    INDEX `services_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `services_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `scope` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    `type` ENUM('INVENTORY', 'POS', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `conversionRate` DECIMAL(10, 4) NULL,
    `baseUnitId` INTEGER NULL,
    `branchId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `units_branchId_idx`(`branchId`),
    INDEX `units_companyId_idx`(`companyId`),
    INDEX `units_scope_idx`(`scope`),
    UNIQUE INDEX `units_name_branchId_key`(`name`, `branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankAccount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bankName` VARCHAR(191) NOT NULL,
    `accountHolder` VARCHAR(255) NULL,
    `accountType` ENUM('BANK', 'CASH', 'CREDIT', 'JAZZCASH', 'EASYPAISA', 'OTHER') NOT NULL DEFAULT 'BANK',
    `accountNumber` VARCHAR(191) NOT NULL,
    `initialBalance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currentBalance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE', 'FROZEN', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `branchId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` INTEGER NULL,

    UNIQUE INDEX `BankAccount_accountNumber_key`(`accountNumber`),
    INDEX `BankAccount_branchId_companyId_idx`(`branchId`, `companyId`),
    INDEX `BankAccount_status_idx`(`status`),
    INDEX `BankAccount_bankName_idx`(`bankName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bankAccountId` INTEGER NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `balanceAfter` DECIMAL(15, 2) NOT NULL,
    `category` ENUM('BOOKING_PAYMENT', 'BOOKING_REFUND', 'EXPENSE', 'SALARY', 'VENDOR_PAYMENT', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'OPENING_BALANCE', 'OTHER') NOT NULL,
    `description` TEXT NOT NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `relatedEntityType` VARCHAR(191) NULL,
    `relatedEntityId` INTEGER NULL,
    `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'CHEQUE', 'JAZZCASH', 'EASYPAISA', 'CREDIT_CARD', 'DEBIT_CARD', 'ONLINE', 'OTHER') NOT NULL DEFAULT 'CASH',
    `transactionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidTo` VARCHAR(191) NULL,
    `paidFrom` VARCHAR(191) NULL,
    `branchId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `createdBy` INTEGER NOT NULL,
    `attachments` TEXT NULL,
    `isReconciled` BOOLEAN NOT NULL DEFAULT false,
    `reconciledAt` DATETIME(3) NULL,
    `reconciledBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AccountTransaction_bankAccountId_transactionDate_idx`(`bankAccountId`, `transactionDate`),
    INDEX `AccountTransaction_bankAccountId_type_idx`(`bankAccountId`, `type`),
    INDEX `AccountTransaction_bankAccountId_category_idx`(`bankAccountId`, `category`),
    INDEX `AccountTransaction_relatedEntityType_relatedEntityId_idx`(`relatedEntityType`, `relatedEntityId`),
    INDEX `AccountTransaction_branchId_companyId_transactionDate_idx`(`branchId`, `companyId`, `transactionDate`),
    INDEX `AccountTransaction_transactionDate_idx`(`transactionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyBalanceSnapshot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bankAccountId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `openingBalance` DECIMAL(15, 2) NOT NULL,
    `closingBalance` DECIMAL(15, 2) NOT NULL,
    `totalCredits` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalDebits` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `transactionCount` INTEGER NOT NULL DEFAULT 0,
    `branchId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DailyBalanceSnapshot_bankAccountId_date_idx`(`bankAccountId`, `date`),
    INDEX `DailyBalanceSnapshot_branchId_companyId_date_idx`(`branchId`, `companyId`, `date`),
    UNIQUE INDEX `DailyBalanceSnapshot_bankAccountId_date_key`(`bankAccountId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountTransfer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fromAccountId` INTEGER NOT NULL,
    `toAccountId` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `transferDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NULL,
    `referenceNumber` VARCHAR(255) NULL,
    `debitTransactionId` INTEGER NULL,
    `creditTransactionId` INTEGER NULL,
    `branchId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AccountTransfer_fromAccountId_transferDate_idx`(`fromAccountId`, `transferDate`),
    INDEX `AccountTransfer_toAccountId_transferDate_idx`(`toAccountId`, `transferDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountCustomCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `branchId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AccountCustomCategory_name_branchId_key`(`name`, `branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `departments_companyId_idx`(`companyId`),
    INDEX `departments_branchId_idx`(`branchId`),
    INDEX `departments_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `departments_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `designations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `defaultSalary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `defaultSalaryType` ENUM('fixed_monthly', 'per_event', 'hourly', 'daily', 'weekly') NOT NULL DEFAULT 'fixed_monthly',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `designations_companyId_idx`(`companyId`),
    INDEX `designations_branchId_idx`(`branchId`),
    INDEX `designations_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `designations_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeCode` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `fatherName` VARCHAR(200) NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NULL,
    `cnic` VARCHAR(20) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `gender` VARCHAR(10) NULL,
    `maritalStatus` VARCHAR(20) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `emergencyContact` VARCHAR(20) NULL,
    `emergencyName` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `designationId` INTEGER NOT NULL,
    `departmentId` INTEGER NULL,
    `joinDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resignDate` DATETIME(3) NULL,
    `salaryType` ENUM('fixed_monthly', 'per_event', 'hourly', 'daily', 'weekly') NOT NULL DEFAULT 'fixed_monthly',
    `basicSalary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `perEventRate` DECIMAL(12, 2) NULL,
    `hourlyRate` DECIMAL(12, 2) NULL,
    `dailyRate` DECIMAL(12, 2) NULL,
    `openingBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `currentBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalEarned` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalPaid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalLoan` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalLoanPaid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAdvance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('active', 'on_leave', 'suspended', 'terminated') NOT NULL DEFAULT 'active',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `userId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_userId_key`(`userId`),
    INDEX `employees_companyId_idx`(`companyId`),
    INDEX `employees_branchId_idx`(`branchId`),
    INDEX `employees_designationId_idx`(`designationId`),
    INDEX `employees_departmentId_idx`(`departmentId`),
    INDEX `employees_status_idx`(`status`),
    INDEX `employees_phone_idx`(`phone`),
    INDEX `employees_userId_idx`(`userId`),
    INDEX `employees_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `employees_employeeCode_companyId_key`(`employeeCode`, `companyId`),
    UNIQUE INDEX `employees_cnic_companyId_key`(`cnic`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `fileType` VARCHAR(50) NULL,
    `expiryDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `employee_documents_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_bank_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `bankName` VARCHAR(100) NOT NULL,
    `accountTitle` VARCHAR(200) NOT NULL,
    `accountNumber` VARCHAR(50) NOT NULL,
    `iban` VARCHAR(50) NULL,
    `branchCode` VARCHAR(20) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `employee_bank_details_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_salary_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `oldSalary` DECIMAL(12, 2) NOT NULL,
    `newSalary` DECIMAL(12, 2) NOT NULL,
    `oldSalaryType` ENUM('fixed_monthly', 'per_event', 'hourly', 'daily', 'weekly') NOT NULL,
    `newSalaryType` ENUM('fixed_monthly', 'per_event', 'hourly', 'daily', 'weekly') NOT NULL,
    `effectiveDate` DATETIME(3) NOT NULL,
    `reason` TEXT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_salary_history_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `checkIn` DATETIME(3) NULL,
    `checkOut` DATETIME(3) NULL,
    `status` ENUM('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday') NOT NULL DEFAULT 'present',
    `overtimeHours` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `overtimeRate` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `overtimeAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `location` VARCHAR(255) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `attendances_employeeId_idx`(`employeeId`),
    INDEX `attendances_date_idx`(`date`),
    INDEX `attendances_companyId_idx`(`companyId`),
    INDEX `attendances_branchId_idx`(`branchId`),
    INDEX `attendances_status_idx`(`status`),
    UNIQUE INDEX `attendances_employeeId_date_key`(`employeeId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leaves` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `type` ENUM('casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity', 'bereavement', 'other') NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `days` INTEGER NOT NULL DEFAULT 0,
    `reason` TEXT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `leaves_employeeId_idx`(`employeeId`),
    INDEX `leaves_companyId_idx`(`companyId`),
    INDEX `leaves_branchId_idx`(`branchId`),
    INDEX `leaves_status_idx`(`status`),
    INDEX `leaves_startDate_endDate_idx`(`startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_leave_balances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `casualTotal` INTEGER NOT NULL DEFAULT 0,
    `casualUsed` INTEGER NOT NULL DEFAULT 0,
    `sickTotal` INTEGER NOT NULL DEFAULT 0,
    `sickUsed` INTEGER NOT NULL DEFAULT 0,
    `annualTotal` INTEGER NOT NULL DEFAULT 0,
    `annualUsed` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employee_leave_balances_employeeId_year_key`(`employeeId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_loans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loanNo` VARCHAR(50) NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'loan',
    `amount` DECIMAL(12, 2) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `remainingAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalInstallments` INTEGER NOT NULL DEFAULT 1,
    `installmentAmount` DECIMAL(12, 2) NOT NULL,
    `deductFromSalary` BOOLEAN NOT NULL DEFAULT true,
    `purpose` VARCHAR(255) NULL,
    `status` ENUM('active', 'paid', 'defaulted', 'waived') NOT NULL DEFAULT 'active',
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `employee_loans_employeeId_idx`(`employeeId`),
    INDEX `employee_loans_companyId_idx`(`companyId`),
    INDEX `employee_loans_branchId_idx`(`branchId`),
    INDEX `employee_loans_status_idx`(`status`),
    UNIQUE INDEX `employee_loans_loanNo_companyId_key`(`loanNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_installments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loanId` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paidDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `payrollId` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loan_installments_loanId_idx`(`loanId`),
    INDEX `loan_installments_payrollId_idx`(`payrollId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payrolls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payrollNo` VARCHAR(50) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `totalEmployees` INTEGER NOT NULL DEFAULT 0,
    `totalBasicSalary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAllowances` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalDeductions` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalBonuses` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalOvertime` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalNetSalary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'processed', 'paid', 'cancelled') NOT NULL DEFAULT 'draft',
    `notes` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `processedById` INTEGER NULL,
    `processedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payrolls_companyId_idx`(`companyId`),
    INDEX `payrolls_branchId_idx`(`branchId`),
    INDEX `payrolls_month_year_idx`(`month`, `year`),
    INDEX `payrolls_status_idx`(`status`),
    UNIQUE INDEX `payrolls_payrollNo_companyId_key`(`payrollNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payrollId` INTEGER NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `totalDays` INTEGER NOT NULL DEFAULT 30,
    `presentDays` INTEGER NOT NULL DEFAULT 0,
    `absentDays` INTEGER NOT NULL DEFAULT 0,
    `leaveDays` INTEGER NOT NULL DEFAULT 0,
    `overtimeHours` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `basicSalary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `houseRent` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `medicalAllowance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `conveyance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `bonus` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `overtimeAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `eventPayments` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `loanDeduction` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `advanceDeduction` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `taxDeduction` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `otherDeductions` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `absentDeduction` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `grossSalary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalDeductions` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `netSalary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `dueAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paymentStatus` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `bankAccountId` INTEGER NULL,
    `paymentDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payroll_items_payrollId_idx`(`payrollId`),
    INDEX `payroll_items_employeeId_idx`(`employeeId`),
    UNIQUE INDEX `payroll_items_payrollId_employeeId_key`(`payrollId`, `employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_staff_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `role` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `paymentType` VARCHAR(20) NOT NULL DEFAULT 'auto',
    `agreedAmount` DECIMAL(12, 2) NOT NULL,
    `hoursWorked` DECIMAL(5, 2) NULL,
    `isPresent` BOOLEAN NOT NULL DEFAULT false,
    `checkInTime` DATETIME(3) NULL,
    `checkOutTime` DATETIME(3) NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paidAt` DATETIME(3) NULL,
    `autoPayOnEventStart` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `event_staff_assignments_bookingId_idx`(`bookingId`),
    INDEX `event_staff_assignments_employeeId_idx`(`employeeId`),
    INDEX `event_staff_assignments_companyId_idx`(`companyId`),
    INDEX `event_staff_assignments_branchId_idx`(`branchId`),
    INDEX `event_staff_assignments_isPaid_idx`(`isPaid`),
    UNIQUE INDEX `event_staff_assignments_bookingId_employeeId_key`(`bookingId`, `employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_ledgers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `type` ENUM('salary', 'advance', 'loan_given', 'loan_recovery', 'event_payment', 'bonus', 'deduction', 'overtime', 'adjustment', 'opening_balance') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `balance` DECIMAL(12, 2) NOT NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` INTEGER NULL,
    `notes` TEXT NULL,
    `bookingId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `staff_ledgers_employeeId_idx`(`employeeId`),
    INDEX `staff_ledgers_companyId_idx`(`companyId`),
    INDEX `staff_ledgers_branchId_idx`(`branchId`),
    INDEX `staff_ledgers_date_idx`(`date`),
    INDEX `staff_ledgers_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentNo` VARCHAR(50) NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentType` ENUM('salary', 'advance', 'loan_given', 'loan_recovery', 'event_payment', 'bonus', 'deduction', 'overtime', 'adjustment', 'opening_balance') NOT NULL,
    `payrollItemId` INTEGER NULL,
    `eventAssignmentId` INTEGER NULL,
    `method` ENUM('cash', 'card', 'bank_transfer', 'upi', 'cheque', 'jazzcash', 'easypaisa', 'credit', 'other') NOT NULL DEFAULT 'cash',
    `bankAccountId` INTEGER NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `staff_payments_employeeId_idx`(`employeeId`),
    INDEX `staff_payments_companyId_idx`(`companyId`),
    INDEX `staff_payments_branchId_idx`(`branchId`),
    INDEX `staff_payments_bankAccountId_idx`(`bankAccountId`),
    INDEX `staff_payments_payrollItemId_idx`(`payrollItemId`),
    UNIQUE INDEX `staff_payments_paymentNo_companyId_key`(`paymentNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fixed_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NULL,
    `category` VARCHAR(100) NOT NULL,
    `condition` ENUM('GOOD', 'DAMAGED', 'UNDER_MAINTENANCE', 'DISPOSED') NOT NULL DEFAULT 'GOOD',
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `costPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalValuation` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `fixed_assets_branchId_idx`(`branchId`),
    INDEX `fixed_assets_companyId_idx`(`companyId`),
    INDEX `fixed_assets_condition_idx`(`condition`),
    INDEX `fixed_assets_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `fixed_assets_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetId` INTEGER NOT NULL,
    `type` ENUM('PURCHASE', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'DAMAGED_LOG', 'DISPOSAL') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `asset_transactions_assetId_idx`(`assetId`),
    INDEX `asset_transactions_branchId_idx`(`branchId`),
    INDEX `asset_transactions_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NULL,
    `description` TEXT NULL,
    `color` VARCHAR(20) NULL,
    `icon` VARCHAR(50) NULL,
    `scope` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `categories_branchId_idx`(`branchId`),
    INDEX `categories_companyId_idx`(`companyId`),
    INDEX `categories_scope_idx`(`scope`),
    INDEX `categories_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `categories_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NULL,
    `categoryId` INTEGER NOT NULL,
    `description` TEXT NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'plate',
    `unitId` INTEGER NULL,
    `isBulkUnit` BOOLEAN NOT NULL DEFAULT false,
    `conversionRate` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `subUnitName` VARCHAR(20) NULL DEFAULT 'plate',
    `costPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `salePrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `items_categoryId_idx`(`categoryId`),
    INDEX `items_branchId_idx`(`branchId`),
    INDEX `items_companyId_idx`(`companyId`),
    INDEX `items_unitId_idx`(`unitId`),
    INDEX `items_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `items_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `eventType` VARCHAR(50) NULL,
    `packageType` VARCHAR(20) NOT NULL DEFAULT 'per_head',
    `status` ENUM('active', 'inactive', 'seasonal', 'archived') NOT NULL DEFAULT 'active',
    `guestCount` INTEGER NOT NULL DEFAULT 100,
    `totalCostPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalSalePrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `profitMargin` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `isSessional` BOOLEAN NOT NULL DEFAULT false,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `menus_branchId_idx`(`branchId`),
    INDEX `menus_companyId_idx`(`companyId`),
    INDEX `menus_status_idx`(`status`),
    UNIQUE INDEX `menus_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `menuId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `menu_categories_menuId_idx`(`menuId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `menuId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `itemId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'Degh',
    `costPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `salePrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `quantityPerHead` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `isBulkUnit` BOOLEAN NOT NULL DEFAULT true,
    `conversionRate` DECIMAL(10, 2) NOT NULL DEFAULT 50,
    `subUnitName` VARCHAR(20) NOT NULL DEFAULT 'plate',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `menu_items_menuId_idx`(`menuId`),
    INDEX `menu_items_categoryId_idx`(`categoryId`),
    INDEX `menu_items_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipe_ingredients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `unit` VARCHAR(255) NOT NULL,
    `unitId` INTEGER NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `costPerUnit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `inventoryItemId` INTEGER NULL,
    `itemId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recipe_ingredients_itemId_idx`(`itemId`),
    INDEX `recipe_ingredients_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `recipe_ingredients_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipe_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dishId` INTEGER NOT NULL,
    `ingredientId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `unitId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recipe_items_dishId_idx`(`dishId`),
    INDEX `recipe_items_ingredientId_idx`(`ingredientId`),
    INDEX `recipe_items_companyId_idx`(`companyId`),
    INDEX `recipe_items_branchId_idx`(`branchId`),
    INDEX `recipe_items_unitId_idx`(`unitId`),
    UNIQUE INDEX `recipe_items_dishId_ingredientId_key`(`dishId`, `ingredientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NULL,
    `category` VARCHAR(100) NOT NULL,
    `subCategory` VARCHAR(100) NULL,
    `unit` VARCHAR(20) NOT NULL,
    `unitId` INTEGER NULL,
    `currentStock` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `minStock` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `maxStock` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `avgCostPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `lastCostPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `salePrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `isBoxEnabled` BOOLEAN NOT NULL DEFAULT false,
    `unitsPerBox` INTEGER NOT NULL DEFAULT 1,
    `manageStock` BOOLEAN NOT NULL DEFAULT true,
    `isPosVisible` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_items_branchId_idx`(`branchId`),
    INDEX `inventory_items_companyId_idx`(`companyId`),
    INDEX `inventory_items_unitId_idx`(`unitId`),
    INDEX `inventory_items_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `inventory_items_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `type` ENUM('PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'WASTAGE') NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `costPrice` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` INTEGER NULL,
    `bookingId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_transactions_inventoryId_idx`(`inventoryId`),
    INDEX `stock_transactions_userId_idx`(`userId`),
    INDEX `stock_transactions_createdAt_idx`(`createdAt`),
    INDEX `stock_transactions_branchId_idx`(`branchId`),
    INDEX `stock_transactions_companyId_idx`(`companyId`),
    INDEX `stock_transactions_bookingId_idx`(`bookingId`),
    INDEX `stock_transactions_referenceType_idx`(`referenceType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transfers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `fromBranchId` INTEGER NOT NULL,
    `toBranchId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    `companyId` INTEGER NOT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_transfers_inventoryId_idx`(`inventoryId`),
    INDEX `stock_transfers_fromBranchId_idx`(`fromBranchId`),
    INDEX `stock_transfers_toBranchId_idx`(`toBranchId`),
    INDEX `stock_transfers_companyId_idx`(`companyId`),
    INDEX `stock_transfers_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NULL,
    `eventType` VARCHAR(50) NULL,
    `status` ENUM('active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
    `description` TEXT NULL,
    `basePrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountPct` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `finalPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `packages_status_idx`(`status`),
    INDEX `packages_branchId_idx`(`branchId`),
    INDEX `packages_companyId_idx`(`companyId`),
    INDEX `packages_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `packages_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_menus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER NOT NULL,
    `menuId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    INDEX `package_menus_packageId_idx`(`packageId`),
    INDEX `package_menus_menuId_idx`(`menuId`),
    UNIQUE INDEX `package_menus_packageId_menuId_key`(`packageId`, `menuId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_extras` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `costPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `salePrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,

    INDEX `package_extras_packageId_idx`(`packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER NOT NULL,
    `serviceId` INTEGER NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `pricingType` VARCHAR(20) NOT NULL DEFAULT 'FIXED',
    `costPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `salePrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `hours` INTEGER NULL,

    INDEX `package_services_packageId_idx`(`packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `color` VARCHAR(20) NULL,
    `icon` VARCHAR(50) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `events_branchId_idx`(`branchId`),
    INDEX `events_companyId_idx`(`companyId`),
    INDEX `events_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `events_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `halls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 0,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `perSeatPrice` DECIMAL(12, 2) NULL,
    `pricingType` VARCHAR(255) NOT NULL DEFAULT 'fixed',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `halls_branchId_idx`(`branchId`),
    INDEX `halls_companyId_idx`(`companyId`),
    INDEX `halls_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `halls_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hall_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `startTime` VARCHAR(10) NOT NULL,
    `endTime` VARCHAR(10) NOT NULL,
    `duration` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `hallId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `hall_sessions_hallId_idx`(`hallId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingNo` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `eventId` INTEGER NULL,
    `eventType` VARCHAR(50) NOT NULL,
    `eventDate` DATETIME(3) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `guestCount` INTEGER NOT NULL DEFAULT 0,
    `actualGuestCount` INTEGER NULL,
    `guestName` VARCHAR(255) NOT NULL,
    `guestPhone` VARCHAR(255) NOT NULL,
    `guestEmail` VARCHAR(255) NULL,
    `customerId` INTEGER NULL,
    `isMealIncluded` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('tentative', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'tentative',
    `paymentStatus` ENUM('pending', 'partial', 'completed', 'refunded', 'failed') NOT NULL DEFAULT 'pending',
    `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `advanceAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `dueAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `taxRateId` INTEGER NULL,
    `taxRate` DECIMAL(5, 2) NULL,
    `taxAmount` DECIMAL(12, 2) NULL,
    `package_total` DECIMAL(15, 2) NULL DEFAULT 0,
    `selected_package` JSON NULL,
    `hallChargeMode` VARCHAR(255) NULL DEFAULT 'per_seat',
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `hallId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `assignedTo` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bookings_eventDate_idx`(`eventDate`),
    INDEX `bookings_status_idx`(`status`),
    INDEX `bookings_branchId_idx`(`branchId`),
    INDEX `bookings_companyId_idx`(`companyId`),
    INDEX `bookings_eventId_idx`(`eventId`),
    INDEX `bookings_customerId_idx`(`customerId`),
    INDEX `bookings_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `bookings_bookingNo_companyId_key`(`bookingNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingCustomItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `itemName` VARCHAR(255) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `unit` VARCHAR(255) NULL,
    `notes` TEXT NULL,

    INDEX `BookingCustomItem_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_menu_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `menuItemId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `unitId` INTEGER NULL,
    `isDeducted` BOOLEAN NOT NULL DEFAULT false,
    `deductedAt` DATETIME(3) NULL,

    INDEX `booking_menu_items_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_menus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `menuId` INTEGER NOT NULL,
    `menuName` VARCHAR(255) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit` VARCHAR(20) NULL,
    `unitId` INTEGER NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,

    INDEX `booking_menus_bookingId_idx`(`bookingId`),
    INDEX `booking_menus_unitId_idx`(`unitId`),
    UNIQUE INDEX `booking_menus_bookingId_menuId_key`(`bookingId`, `menuId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `serviceName` VARCHAR(255) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `booking_services_bookingId_idx`(`bookingId`),
    INDEX `booking_services_serviceId_idx`(`serviceId`),
    UNIQUE INDEX `booking_services_bookingId_serviceId_key`(`bookingId`, `serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hall_booking_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hallId` INTEGER NOT NULL,
    `bookingId` INTEGER NOT NULL,
    `slotDate` DATETIME(3) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `guestCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hall_booking_slots_hallId_slotDate_idx`(`hallId`, `slotDate`),
    INDEX `hall_booking_slots_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_change_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `fieldName` VARCHAR(50) NOT NULL,
    `changeType` ENUM('added', 'removed', 'quantity_changed', 'price_changed', 'guest_count_changed', 'hall_changed', 'time_changed', 'status_changed', 'other') NOT NULL DEFAULT 'other',
    `oldValue` VARCHAR(255) NULL,
    `newValue` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `changedById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_change_logs_bookingId_idx`(`bookingId`),
    INDEX `booking_change_logs_changedById_idx`(`changedById`),
    INDEX `booking_change_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_menu_change_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `menuId` INTEGER NOT NULL,
    `changeType` ENUM('added', 'removed', 'quantity_changed', 'price_changed', 'guest_count_changed', 'hall_changed', 'time_changed', 'status_changed', 'other') NOT NULL DEFAULT 'other',
    `oldQuantity` INTEGER NULL,
    `newQuantity` INTEGER NULL,
    `oldPrice` DECIMAL(12, 2) NULL,
    `newPrice` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `changedById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_menu_change_logs_bookingId_idx`(`bookingId`),
    INDEX `booking_menu_change_logs_menuId_idx`(`menuId`),
    INDEX `booking_menu_change_logs_changedById_idx`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_service_change_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `changeType` ENUM('added', 'removed', 'quantity_changed', 'price_changed', 'guest_count_changed', 'hall_changed', 'time_changed', 'status_changed', 'other') NOT NULL DEFAULT 'other',
    `oldQuantity` INTEGER NULL,
    `newQuantity` INTEGER NULL,
    `oldPrice` DECIMAL(12, 2) NULL,
    `newPrice` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `changedById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_service_change_logs_bookingId_idx`(`bookingId`),
    INDEX `booking_service_change_logs_serviceId_idx`(`serviceId`),
    INDEX `booking_service_change_logs_changedById_idx`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_executions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `status` ENUM('planned', 'in_progress', 'completed', 'cancelled', 'billed') NOT NULL DEFAULT 'planned',
    `plannedGuestCount` INTEGER NOT NULL DEFAULT 0,
    `actualGuestCount` INTEGER NOT NULL DEFAULT 0,
    `extraGuestCount` INTEGER NOT NULL DEFAULT 0,
    `hallCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `menuCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `serviceCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `inventoryCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `wastageCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `damageCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `otherCosts` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalRevenue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalDiscount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `netRevenue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `profit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `profitMargin` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `inventoryDeducted` BOOLEAN NOT NULL DEFAULT false,
    `inventoryDeductedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `event_executions_bookingId_key`(`bookingId`),
    INDEX `event_executions_bookingId_idx`(`bookingId`),
    INDEX `event_executions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_dish_usage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `menuItemId` INTEGER NULL,
    `dishName` VARCHAR(200) NOT NULL,
    `plannedQuantity` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `actualQuantity` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `unit` VARCHAR(20) NOT NULL,
    `unitId` INTEGER NULL,
    `costPerUnit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `event_dish_usage_bookingId_idx`(`bookingId`),
    INDEX `event_dish_usage_menuItemId_idx`(`menuItemId`),
    INDEX `event_dish_usage_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_inventory_consumption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `inventoryItemId` INTEGER NOT NULL,
    `plannedQuantity` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `actualQuantity` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `unit` VARCHAR(20) NOT NULL,
    `unitId` INTEGER NULL,
    `costPerUnit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `event_inventory_consumption_bookingId_idx`(`bookingId`),
    INDEX `event_inventory_consumption_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `event_inventory_consumption_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_damages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `inventoryItemId` INTEGER NULL,
    `assetId` INTEGER NULL,
    `itemName` VARCHAR(200) NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `unit` VARCHAR(20) NULL,
    `unitId` INTEGER NULL,
    `costPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `images` VARCHAR(255) NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `event_damages_bookingId_idx`(`bookingId`),
    INDEX `event_damages_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `event_damages_assetId_idx`(`assetId`),
    INDEX `event_damages_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceNo` VARCHAR(50) NOT NULL,
    `bookingId` INTEGER NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
    `dueDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoices_bookingId_idx`(`bookingId`),
    INDEX `invoices_branchId_idx`(`branchId`),
    INDEX `invoices_companyId_idx`(`companyId`),
    INDEX `invoices_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `invoices_invoiceNo_companyId_key`(`invoiceNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoice_items_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentNo` VARCHAR(50) NOT NULL,
    `invoiceId` INTEGER NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` ENUM('cash', 'card', 'bank_transfer', 'upi', 'cheque', 'jazzcash', 'easypaisa', 'credit', 'other') NOT NULL DEFAULT 'cash',
    `paymentType` ENUM('advance', 'partial', 'final', 'extra_charge', 'refund', 'deposit') NOT NULL DEFAULT 'final',
    `reference` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `status` ENUM('pending', 'partial', 'completed', 'refunded', 'failed') NOT NULL DEFAULT 'completed',
    `purchaseBillId` INTEGER NULL,
    `purchaseId` INTEGER NULL,
    `bookingId` INTEGER NULL,
    `supplierId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `bankAccountId` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payments_invoiceId_idx`(`invoiceId`),
    INDEX `payments_userId_idx`(`userId`),
    INDEX `payments_branchId_idx`(`branchId`),
    INDEX `payments_companyId_idx`(`companyId`),
    INDEX `payments_deletedAt_idx`(`deletedAt`),
    INDEX `payments_bankAccountId_idx`(`bankAccountId`),
    UNIQUE INDEX `payments_paymentNo_companyId_key`(`paymentNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    `bookingId` INTEGER NOT NULL,
    `assignedTo` INTEGER NULL,
    `dueDate` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tasks_bookingId_idx`(`bookingId`),
    INDEX `tasks_status_idx`(`status`),
    INDEX `tasks_branchId_idx`(`branchId`),
    INDEX `tasks_companyId_idx`(`companyId`),
    INDEX `tasks_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionNo` VARCHAR(50) NOT NULL,
    `userId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `openingTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closingTime` DATETIME(3) NULL,
    `openingCash` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `closingCash` DECIMAL(12, 2) NULL,
    `expectedCash` DECIMAL(12, 2) NULL,
    `difference` DECIMAL(12, 2) NULL,
    `status` ENUM('open', 'closed', 'reconciled') NOT NULL DEFAULT 'open',
    `notes` TEXT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pos_sessions_userId_idx`(`userId`),
    INDEX `pos_sessions_branchId_idx`(`branchId`),
    INDEX `pos_sessions_companyId_idx`(`companyId`),
    INDEX `pos_sessions_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `pos_sessions_sessionNo_companyId_key`(`sessionNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionNo` VARCHAR(50) NOT NULL,
    `sessionId` INTEGER NOT NULL,
    `type` ENUM('sale', 'refund', 'exchange', 'expense', 'deposit', 'withdrawal') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentMethod` ENUM('cash', 'card', 'bank_transfer', 'upi', 'cheque', 'jazzcash', 'easypaisa', 'credit', 'other') NOT NULL DEFAULT 'cash',
    `customerName` VARCHAR(255) NULL,
    `customerPhone` VARCHAR(255) NULL,
    `status` ENUM('completed', 'cancelled', 'pending') NOT NULL DEFAULT 'completed',
    `notes` TEXT NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pos_transactions_sessionId_idx`(`sessionId`),
    INDEX `pos_transactions_branchId_idx`(`branchId`),
    INDEX `pos_transactions_companyId_idx`(`companyId`),
    INDEX `pos_transactions_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `pos_transactions_transactionNo_companyId_key`(`transactionNo`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_transaction_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionId` INTEGER NOT NULL,
    `itemName` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `itemId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pos_transaction_items_transactionId_idx`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `whatsapp_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `messageId` VARCHAR(100) NOT NULL,
    `phoneNumber` VARCHAR(20) NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('pending', 'sent', 'delivered', 'read', 'failed') NOT NULL DEFAULT 'sent',
    `bookingId` INTEGER NULL,
    `userId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deliveredAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,

    INDEX `whatsapp_messages_phoneNumber_idx`(`phoneNumber`),
    INDEX `whatsapp_messages_bookingId_idx`(`bookingId`),
    INDEX `whatsapp_messages_branchId_idx`(`branchId`),
    INDEX `whatsapp_messages_companyId_idx`(`companyId`),
    UNIQUE INDEX `whatsapp_messages_messageId_companyId_key`(`messageId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emailId` VARCHAR(100) NOT NULL,
    `from` VARCHAR(255) NOT NULL,
    `to` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('pending', 'sent', 'delivered', 'failed') NOT NULL DEFAULT 'sent',
    `bookingId` INTEGER NULL,
    `userId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `error` TEXT NULL,

    INDEX `email_logs_to_idx`(`to`),
    INDEX `email_logs_bookingId_idx`(`bookingId`),
    INDEX `email_logs_branchId_idx`(`branchId`),
    INDEX `email_logs_companyId_idx`(`companyId`),
    UNIQUE INDEX `email_logs_emailId_companyId_key`(`emailId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wastage_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `unitId` INTEGER NULL,
    `reason` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `bookingId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `wastage_logs_inventoryId_idx`(`inventoryId`),
    INDEX `wastage_logs_bookingId_idx`(`bookingId`),
    INDEX `wastage_logs_companyId_idx`(`companyId`),
    INDEX `wastage_logs_branchId_idx`(`branchId`),
    INDEX `wastage_logs_unitId_idx`(`unitId`),
    INDEX `wastage_logs_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `planDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'planned',
    `notes` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `production_plans_bookingId_idx`(`bookingId`),
    INDEX `production_plans_companyId_idx`(`companyId`),
    INDEX `production_plans_branchId_idx`(`branchId`),
    INDEX `production_plans_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_plan_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productionPlanId` INTEGER NOT NULL,
    `menuItemId` INTEGER NULL,
    `inventoryItemId` INTEGER NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `unitId` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `production_plan_items_productionPlanId_idx`(`productionPlanId`),
    INDEX `production_plan_items_menuItemId_idx`(`menuItemId`),
    INDEX `production_plan_items_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `production_plan_items_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kitchen_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'normal',
    `notes` TEXT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `kitchen_orders_bookingId_idx`(`bookingId`),
    INDEX `kitchen_orders_status_idx`(`status`),
    INDEX `kitchen_orders_companyId_idx`(`companyId`),
    INDEX `kitchen_orders_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kitchen_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kitchenOrderId` INTEGER NOT NULL,
    `menuItemId` INTEGER NULL,
    `inventoryItemId` INTEGER NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `unitId` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `kitchen_order_items_kitchenOrderId_idx`(`kitchenOrderId`),
    INDEX `kitchen_order_items_menuItemId_idx`(`menuItemId`),
    INDEX `kitchen_order_items_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `kitchen_order_items_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NULL,
    `changes` JSON NULL,
    `ip` VARCHAR(255) NULL,
    `userAgent` TEXT NULL,
    `branchId` INTEGER NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    INDEX `audit_logs_branchId_idx`(`branchId`),
    INDEX `audit_logs_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(255) NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `fileType` VARCHAR(255) NULL,
    `fileSize` INTEGER NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `file_attachments_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `file_attachments_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `roles_companyId_idx`(`companyId`),
    UNIQUE INDEX `roles_slug_companyId_key`(`slug`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER NULL,
    `resource` ENUM('dashboard', 'bookings', 'bookings_create', 'bookings_calendar', 'bookings_list', 'customers', 'customers_add', 'events', 'events_add', 'services', 'services_list', 'menus', 'menus_add', 'menu_packages', 'menu_items', 'menu_categories', 'menu_units', 'pos', 'inventory', 'inventory_item_master', 'inventory_stock_transfer', 'inventory_stock_adjustment', 'kitchen', 'kitchen_sheet', 'kds', 'production_plan', 'recipe_manager', 'wastage_log', 'accounts', 'accounts_list', 'payment_voucher', 'expense_voucher', 'voucher_list', 'ledger', 'day_book', 'fixed_assets', 'fixed_assets_add', 'fixed_assets_adjustments', 'procurement', 'suppliers', 'purchase_orders', 'purchase_orders_create', 'grn', 'purchase_return', 'hr', 'staff_list', 'employees_add', 'attendance', 'payroll', 'leave', 'advance_loan', 'event_staff', 'hr_setup', 'reports', 'reports_dashboard', 'profit_loss', 'reports_bookings', 'reports_inventory', 'reports_hr', 'reports_finance', 'reports_kitchen', 'reports_purchases', 'reports_customers', 'settings', 'settings_branches', 'settings_halls', 'settings_receipt', 'settings_tax', 'settings_roles', 'settings_backup', 'users', 'branches', 'companies') NOT NULL,
    `action` ENUM('view', 'create', 'edit', 'delete', 'export', 'import', 'print', 'approve', 'execute') NOT NULL,
    `allowed` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `role_permissions_roleId_idx`(`roleId`),
    UNIQUE INDEX `role_permissions_roleId_resource_action_key`(`roleId`, `resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_role_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_role_assignments_userId_idx`(`userId`),
    INDEX `user_role_assignments_roleId_idx`(`roleId`),
    UNIQUE INDEX `user_role_assignments_userId_roleId_companyId_branchId_key`(`userId`, `roleId`, `companyId`, `branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `backupNo` VARCHAR(50) NOT NULL,
    `fileName` VARCHAR(200) NOT NULL,
    `filePath` VARCHAR(500) NULL,
    `fileSize` INTEGER NULL,
    `driveFileId` VARCHAR(200) NULL,
    `driveLink` VARCHAR(500) NULL,
    `status` ENUM('pending', 'running', 'completed', 'failed', 'deleted') NOT NULL DEFAULT 'pending',
    `location` ENUM('local', 'google_drive', 'both') NOT NULL DEFAULT 'local',
    `dbName` VARCHAR(100) NOT NULL,
    `tablesCount` INTEGER NULL DEFAULT 0,
    `isAutoDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `deletedReason` VARCHAR(100) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `backup_logs_backupNo_key`(`backupNo`),
    INDEX `backup_logs_companyId_createdAt_idx`(`companyId`, `createdAt`),
    INDEX `backup_logs_status_idx`(`status`),
    INDEX `backup_logs_location_idx`(`location`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipt_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyName` VARCHAR(200) NOT NULL DEFAULT 'UniSoft Enterprise',
    `companySlogan` VARCHAR(200) NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `website` VARCHAR(100) NULL,
    `logoUrl` LONGTEXT NULL,
    `headerText` VARCHAR(500) NULL,
    `footerText` VARCHAR(500) NULL,
    `marqueeText` VARCHAR(500) NULL,
    `showLogo` BOOLEAN NOT NULL DEFAULT true,
    `showCompanyName` BOOLEAN NOT NULL DEFAULT true,
    `showSlogan` BOOLEAN NOT NULL DEFAULT true,
    `showAddress` BOOLEAN NOT NULL DEFAULT true,
    `showPhone` BOOLEAN NOT NULL DEFAULT true,
    `showEmail` BOOLEAN NOT NULL DEFAULT true,
    `showWebsite` BOOLEAN NOT NULL DEFAULT true,
    `showHeaderText` BOOLEAN NOT NULL DEFAULT true,
    `showFooterText` BOOLEAN NOT NULL DEFAULT true,
    `showMarquee` BOOLEAN NOT NULL DEFAULT true,
    `showQrCode` BOOLEAN NOT NULL DEFAULT false,
    `showBarcode` BOOLEAN NOT NULL DEFAULT false,
    `showGst` BOOLEAN NOT NULL DEFAULT false,
    `showNTN` BOOLEAN NOT NULL DEFAULT false,
    `showEventDetails` BOOLEAN NOT NULL DEFAULT true,
    `showCustomerDetails` BOOLEAN NOT NULL DEFAULT true,
    `showPaymentHistory` BOOLEAN NOT NULL DEFAULT true,
    `gstNumber` VARCHAR(50) NULL,
    `ntnNumber` VARCHAR(50) NULL,
    `themeColor` VARCHAR(20) NOT NULL DEFAULT '#1a1a2e',
    `accentColor` VARCHAR(20) NOT NULL DEFAULT '#A97A1F',
    `thermalWidth` VARCHAR(10) NOT NULL DEFAULT '80mm',
    `thermalFontSize` VARCHAR(10) NOT NULL DEFAULT '12px',
    `deletedAt` DATETIME(3) NULL,
    `companyId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `receipt_settings_companyId_idx`(`companyId`),
    INDEX `receipt_settings_branchId_idx`(`branchId`),
    INDEX `receipt_settings_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `receipt_settings_companyId_branchId_key`(`companyId`, `branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_settings` ADD CONSTRAINT `company_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_settings` ADD CONSTRAINT `company_settings_currencyId_fkey` FOREIGN KEY (`currencyId`) REFERENCES `currencies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branch_settings` ADD CONSTRAINT `branch_settings_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `po_items` ADD CONSTRAINT `po_items_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `po_items` ADD CONSTRAINT `po_items_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_ledgers` ADD CONSTRAINT `supplier_ledgers_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_ledgers` ADD CONSTRAINT `supplier_ledgers_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_ledgers` ADD CONSTRAINT `supplier_ledgers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_ledgers` ADD CONSTRAINT `supplier_ledgers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_bills` ADD CONSTRAINT `purchase_bills_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_bills` ADD CONSTRAINT `purchase_bills_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_bills` ADD CONSTRAINT `purchase_bills_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_bills` ADD CONSTRAINT `purchase_bills_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_bills` ADD CONSTRAINT `purchase_bills_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_bill_items` ADD CONSTRAINT `purchase_bill_items_purchaseBillId_fkey` FOREIGN KEY (`purchaseBillId`) REFERENCES `purchase_bills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_bill_items` ADD CONSTRAINT `purchase_bill_items_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_return_items` ADD CONSTRAINT `purchase_return_items_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `purchase_returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_return_items` ADD CONSTRAINT `purchase_return_items_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_rates` ADD CONSTRAINT `tax_rates_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_members` ADD CONSTRAINT `company_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_members` ADD CONSTRAINT `company_members_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_emergency_contacts` ADD CONSTRAINT `customer_emergency_contacts_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_baseUnitId_fkey` FOREIGN KEY (`baseUnitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankAccount` ADD CONSTRAINT `BankAccount_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankAccount` ADD CONSTRAINT `BankAccount_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountTransaction` ADD CONSTRAINT `AccountTransaction_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountTransaction` ADD CONSTRAINT `AccountTransaction_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountTransaction` ADD CONSTRAINT `AccountTransaction_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountTransaction` ADD CONSTRAINT `AccountTransaction_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyBalanceSnapshot` ADD CONSTRAINT `DailyBalanceSnapshot_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountTransfer` ADD CONSTRAINT `AccountTransfer_fromAccountId_fkey` FOREIGN KEY (`fromAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountTransfer` ADD CONSTRAINT `AccountTransfer_toAccountId_fkey` FOREIGN KEY (`toAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountCustomCategory` ADD CONSTRAINT `AccountCustomCategory_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountCustomCategory` ADD CONSTRAINT `AccountCustomCategory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `designations` ADD CONSTRAINT `designations_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `designations` ADD CONSTRAINT `designations_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_designationId_fkey` FOREIGN KEY (`designationId`) REFERENCES `designations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_documents` ADD CONSTRAINT `employee_documents_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_bank_details` ADD CONSTRAINT `employee_bank_details_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_salary_history` ADD CONSTRAINT `employee_salary_history_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leaves` ADD CONSTRAINT `leaves_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leaves` ADD CONSTRAINT `leaves_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leaves` ADD CONSTRAINT `leaves_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_leave_balances` ADD CONSTRAINT `employee_leave_balances_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_loans` ADD CONSTRAINT `employee_loans_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_loans` ADD CONSTRAINT `employee_loans_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_loans` ADD CONSTRAINT `employee_loans_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_installments` ADD CONSTRAINT `loan_installments_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `employee_loans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_items` ADD CONSTRAINT `payroll_items_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `payrolls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_items` ADD CONSTRAINT `payroll_items_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_staff_assignments` ADD CONSTRAINT `event_staff_assignments_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_staff_assignments` ADD CONSTRAINT `event_staff_assignments_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_staff_assignments` ADD CONSTRAINT `event_staff_assignments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_staff_assignments` ADD CONSTRAINT `event_staff_assignments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_ledgers` ADD CONSTRAINT `staff_ledgers_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_ledgers` ADD CONSTRAINT `staff_ledgers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_ledgers` ADD CONSTRAINT `staff_ledgers_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_ledgers` ADD CONSTRAINT `staff_ledgers_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_payments` ADD CONSTRAINT `staff_payments_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_payments` ADD CONSTRAINT `staff_payments_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_payments` ADD CONSTRAINT `staff_payments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_payments` ADD CONSTRAINT `staff_payments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_payments` ADD CONSTRAINT `staff_payments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fixed_assets` ADD CONSTRAINT `fixed_assets_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fixed_assets` ADD CONSTRAINT `fixed_assets_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_transactions` ADD CONSTRAINT `asset_transactions_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `fixed_assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_transactions` ADD CONSTRAINT `asset_transactions_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_transactions` ADD CONSTRAINT `asset_transactions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menus` ADD CONSTRAINT `menus_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menus` ADD CONSTRAINT `menus_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menus` ADD CONSTRAINT `menus_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menus` ADD CONSTRAINT `menus_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_categories` ADD CONSTRAINT `menu_categories_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `menu_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_items` ADD CONSTRAINT `recipe_items_dishId_fkey` FOREIGN KEY (`dishId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_items` ADD CONSTRAINT `recipe_items_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_items` ADD CONSTRAINT `recipe_items_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_items` ADD CONSTRAINT `recipe_items_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_items` ADD CONSTRAINT `recipe_items_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_fromBranchId_fkey` FOREIGN KEY (`fromBranchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_toBranchId_fkey` FOREIGN KEY (`toBranchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packages` ADD CONSTRAINT `packages_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packages` ADD CONSTRAINT `packages_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packages` ADD CONSTRAINT `packages_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packages` ADD CONSTRAINT `packages_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_menus` ADD CONSTRAINT `package_menus_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_menus` ADD CONSTRAINT `package_menus_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_extras` ADD CONSTRAINT `package_extras_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_services` ADD CONSTRAINT `package_services_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_services` ADD CONSTRAINT `package_services_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `halls` ADD CONSTRAINT `halls_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `halls` ADD CONSTRAINT `halls_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `halls` ADD CONSTRAINT `halls_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `halls` ADD CONSTRAINT `halls_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hall_sessions` ADD CONSTRAINT `hall_sessions_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `halls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `halls`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingCustomItem` ADD CONSTRAINT `BookingCustomItem_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_menu_items` ADD CONSTRAINT `booking_menu_items_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_menu_items` ADD CONSTRAINT `booking_menu_items_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_menu_items` ADD CONSTRAINT `booking_menu_items_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_menus` ADD CONSTRAINT `booking_menus_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_menus` ADD CONSTRAINT `booking_menus_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_menus` ADD CONSTRAINT `booking_menus_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_services` ADD CONSTRAINT `booking_services_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_services` ADD CONSTRAINT `booking_services_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hall_booking_slots` ADD CONSTRAINT `hall_booking_slots_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `halls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hall_booking_slots` ADD CONSTRAINT `hall_booking_slots_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_change_logs` ADD CONSTRAINT `booking_change_logs_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_change_logs` ADD CONSTRAINT `booking_change_logs_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_menu_change_logs` ADD CONSTRAINT `booking_menu_change_logs_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_menu_change_logs` ADD CONSTRAINT `booking_menu_change_logs_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `menus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_menu_change_logs` ADD CONSTRAINT `booking_menu_change_logs_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_service_change_logs` ADD CONSTRAINT `booking_service_change_logs_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_service_change_logs` ADD CONSTRAINT `booking_service_change_logs_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_service_change_logs` ADD CONSTRAINT `booking_service_change_logs_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_executions` ADD CONSTRAINT `event_executions_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_dish_usage` ADD CONSTRAINT `event_dish_usage_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_dish_usage` ADD CONSTRAINT `event_dish_usage_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_dish_usage` ADD CONSTRAINT `event_dish_usage_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_inventory_consumption` ADD CONSTRAINT `event_inventory_consumption_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_inventory_consumption` ADD CONSTRAINT `event_inventory_consumption_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_inventory_consumption` ADD CONSTRAINT `event_inventory_consumption_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_damages` ADD CONSTRAINT `event_damages_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_damages` ADD CONSTRAINT `event_damages_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_damages` ADD CONSTRAINT `event_damages_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `fixed_assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_damages` ADD CONSTRAINT `event_damages_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_damages` ADD CONSTRAINT `event_damages_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_purchaseBillId_fkey` FOREIGN KEY (`purchaseBillId`) REFERENCES `purchase_bills`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_sessions` ADD CONSTRAINT `pos_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_sessions` ADD CONSTRAINT `pos_sessions_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_transactions` ADD CONSTRAINT `pos_transactions_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `pos_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_transactions` ADD CONSTRAINT `pos_transactions_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_transaction_items` ADD CONSTRAINT `pos_transaction_items_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `pos_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_transaction_items` ADD CONSTRAINT `pos_transaction_items_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wastage_logs` ADD CONSTRAINT `wastage_logs_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wastage_logs` ADD CONSTRAINT `wastage_logs_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wastage_logs` ADD CONSTRAINT `wastage_logs_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wastage_logs` ADD CONSTRAINT `wastage_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wastage_logs` ADD CONSTRAINT `wastage_logs_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wastage_logs` ADD CONSTRAINT `wastage_logs_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_plans` ADD CONSTRAINT `production_plans_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_plans` ADD CONSTRAINT `production_plans_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_plans` ADD CONSTRAINT `production_plans_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_plan_items` ADD CONSTRAINT `production_plan_items_productionPlanId_fkey` FOREIGN KEY (`productionPlanId`) REFERENCES `production_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_plan_items` ADD CONSTRAINT `production_plan_items_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_plan_items` ADD CONSTRAINT `production_plan_items_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_plan_items` ADD CONSTRAINT `production_plan_items_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_orders` ADD CONSTRAINT `kitchen_orders_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_orders` ADD CONSTRAINT `kitchen_orders_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_orders` ADD CONSTRAINT `kitchen_orders_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_order_items` ADD CONSTRAINT `kitchen_order_items_kitchenOrderId_fkey` FOREIGN KEY (`kitchenOrderId`) REFERENCES `kitchen_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_order_items` ADD CONSTRAINT `kitchen_order_items_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_order_items` ADD CONSTRAINT `kitchen_order_items_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_order_items` ADD CONSTRAINT `kitchen_order_items_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_attachments` ADD CONSTRAINT `file_attachments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `backup_logs` ADD CONSTRAINT `backup_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `backup_logs` ADD CONSTRAINT `backup_logs_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `backup_logs` ADD CONSTRAINT `backup_logs_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt_settings` ADD CONSTRAINT `receipt_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt_settings` ADD CONSTRAINT `receipt_settings_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
