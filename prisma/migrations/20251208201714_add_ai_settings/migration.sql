-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `aiModel` VARCHAR(191) NOT NULL DEFAULT 'llama3',
    ADD COLUMN `aiPersona` TEXT NULL,
    ADD COLUMN `aiProvider` VARCHAR(191) NOT NULL DEFAULT 'ollama';
