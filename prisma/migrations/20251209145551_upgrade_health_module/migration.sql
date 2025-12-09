-- AlterTable
ALTER TABLE `Workout` ADD COLUMN `distance` DOUBLE NULL,
    ADD COLUMN `exercises` TEXT NULL,
    ADD COLUMN `feeling` VARCHAR(191) NULL,
    ADD COLUMN `muscleGroup` VARCHAR(191) NULL,
    ADD COLUMN `pace` VARCHAR(191) NULL;
