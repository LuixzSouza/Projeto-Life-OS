-- AlterTable
ALTER TABLE `Account` ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `isConnected` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `provider` VARCHAR(191) NULL;
