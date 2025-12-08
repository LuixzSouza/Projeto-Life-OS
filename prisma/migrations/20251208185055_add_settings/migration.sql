-- CreateTable
CREATE TABLE `Settings` (
    `id` VARCHAR(191) NOT NULL,
    `theme` VARCHAR(191) NOT NULL DEFAULT 'system',
    `accentColor` VARCHAR(191) NOT NULL DEFAULT 'zinc',
    `language` VARCHAR(191) NOT NULL DEFAULT 'pt-BR',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
