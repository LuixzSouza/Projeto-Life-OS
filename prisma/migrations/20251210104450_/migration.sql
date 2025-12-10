-- DropForeignKey
ALTER TABLE `StudySession` DROP FOREIGN KEY `StudySession_subjectId_fkey`;

-- AlterTable
ALTER TABLE `StudySession` ADD COLUMN `focusLevel` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `tags` TEXT NULL,
    ADD COLUMN `type` ENUM('LEITURA', 'VIDEO', 'EXERCICIO', 'REVISAO', 'PROJETO') NOT NULL DEFAULT 'LEITURA';

-- AlterTable
ALTER TABLE `StudySubject` ADD COLUMN `difficulty` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `goalMinutes` INTEGER NOT NULL DEFAULT 3600,
    ADD COLUMN `icon` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `UserStats` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `lastStudyDate` DATETIME(3) NULL,
    `dailyGoalMinutes` INTEGER NOT NULL DEFAULT 60,
    `badges` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserStats_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserStats` ADD CONSTRAINT `UserStats_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySession` ADD CONSTRAINT `StudySession_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `StudySubject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
