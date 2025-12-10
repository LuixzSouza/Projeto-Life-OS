/*
  Warnings:

  - You are about to drop the column `easinessFactor` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `FlashcardDeck` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Flashcard` DROP COLUMN `easinessFactor`,
    ADD COLUMN `box` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `FlashcardDeck` DROP COLUMN `color`;
