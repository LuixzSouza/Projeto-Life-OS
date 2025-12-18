-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BodyMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" REAL NOT NULL,
    "height" REAL NOT NULL,
    "gender" TEXT NOT NULL,
    "activity" REAL NOT NULL DEFAULT 1.2,
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
INSERT INTO "new_BodyMeasurement" ("activity", "armLeft", "armRight", "calfLeft", "calfRight", "chest", "date", "forearmLeft", "forearmRight", "gender", "height", "hip", "id", "neck", "shoulders", "thighLeft", "thighRight", "userId", "waist", "weight") SELECT "activity", "armLeft", "armRight", "calfLeft", "calfRight", "chest", "date", "forearmLeft", "forearmRight", "gender", "height", "hip", "id", "neck", "shoulders", "thighLeft", "thighRight", "userId", "waist", "weight" FROM "BodyMeasurement";
DROP TABLE "BodyMeasurement";
ALTER TABLE "new_BodyMeasurement" RENAME TO "BodyMeasurement";
CREATE INDEX "BodyMeasurement_date_idx" ON "BodyMeasurement"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
