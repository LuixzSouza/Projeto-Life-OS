-- AlterTable
ALTER TABLE `FlashcardDeck` ADD COLUMN `studySubjectId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `FlashcardDeck` ADD CONSTRAINT `FlashcardDeck_studySubjectId_fkey` FOREIGN KEY (`studySubjectId`) REFERENCES `StudySubject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
