-- AlterTable
ALTER TABLE "AccessItem" ADD COLUMN "client_name" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "coverUrl" TEXT;

-- CreateTable
CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" REAL NOT NULL,
    "height" REAL NOT NULL,
    "gender" TEXT NOT NULL,
    "activity" REAL NOT NULL,
    "neck" REAL,
    "waist" REAL,
    "hip" REAL,
    "shoulders" REAL,
    "chest" REAL,
    "armLeft" REAL,
    "armRight" REAL,
    "forearmLeft" REAL,
    "forearmRight" REAL,
    "thighLeft" REAL,
    "thighRight" REAL,
    "calfLeft" REAL,
    "calfRight" REAL,
    "userId" TEXT,
    CONSTRAINT "BodyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "accentColor" TEXT NOT NULL DEFAULT 'zinc',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "workStart" TEXT NOT NULL DEFAULT '09:00',
    "workEnd" TEXT NOT NULL DEFAULT '18:00',
    "aiProvider" TEXT NOT NULL DEFAULT 'ollama',
    "aiModel" TEXT NOT NULL DEFAULT 'llama3',
    "aiPersona" TEXT,
    "aiUsage" TEXT,
    "userId" TEXT,
    "tmdb_api_key" TEXT,
    "rawg_api_key" TEXT,
    "pluggy_client_id" TEXT,
    "pluggy_client_secret" TEXT,
    "openaiKey" TEXT,
    "groqKey" TEXT,
    "googleKey" TEXT,
    "storagePath" TEXT DEFAULT 'D:/LifeOS_Data',
    "updatedAt" DATETIME NOT NULL,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Settings" ("accentColor", "aiModel", "aiPersona", "aiProvider", "aiUsage", "googleKey", "groqKey", "id", "language", "openaiKey", "storagePath", "theme", "updatedAt") SELECT "accentColor", "aiModel", "aiPersona", "aiProvider", "aiUsage", "googleKey", "groqKey", "id", "language", "openaiKey", "storagePath", "theme", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BodyMeasurement_date_idx" ON "BodyMeasurement"("date");
