-- Taxonomia PARA (Roadmap Fase 2 — #10), aditiva e opcional (null = não classificado).

-- AlterTable
ALTER TABLE "Notebook" ADD COLUMN "paraType" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "paraType" TEXT;

-- AlterTable
ALTER TABLE "SavedLink" ADD COLUMN "paraType" TEXT;
