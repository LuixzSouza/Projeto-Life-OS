-- CreateTable
CREATE TABLE `FlashcardDeck` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#3b82f6',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Flashcard` (
    `id` VARCHAR(191) NOT NULL,
    `term` VARCHAR(191) NOT NULL,
    `definition` TEXT NOT NULL,
    `imageUrl` TEXT NULL,
    `lastReviewed` DATETIME(3) NULL,
    `nextReview` DATETIME(3) NULL,
    `easinessFactor` DOUBLE NOT NULL DEFAULT 2.5,
    `deckId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Flashcard` ADD CONSTRAINT `Flashcard_deckId_fkey` FOREIGN KEY (`deckId`) REFERENCES `FlashcardDeck`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
