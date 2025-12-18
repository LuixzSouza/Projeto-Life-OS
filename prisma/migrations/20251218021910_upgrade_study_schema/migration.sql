/*
  Warnings:

  - You are about to drop the `StudyTopic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `topicId` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `topicId` on the `LearningGoal` table. All the data in the column will be lost.
  - You are about to drop the column `topicId` on the `StudyContent` table. All the data in the column will be lost.
  - You are about to drop the column `topicId` on the `StudyNote` table. All the data in the column will be lost.
  - You are about to drop the column `topicId` on the `StudySession` table. All the data in the column will be lost.
  - Added the required column `subjectId` to the `StudyContent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `StudySession` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "StudyTopic";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "StudySubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "category" TEXT,
    "color" TEXT DEFAULT 'blue',
    "icon" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "goalMinutes" INTEGER NOT NULL DEFAULT 3600,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudySubject_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StudySubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FlashcardDeck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'LEITNER',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareCode" TEXT,
    "masteredCount" INTEGER NOT NULL DEFAULT 0,
    "studySubjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FlashcardDeck_studySubjectId_fkey" FOREIGN KEY ("studySubjectId") REFERENCES "StudySubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FlashcardDeck" ("algorithm", "createdAt", "description", "id", "isPublic", "masteredCount", "shareCode", "title", "updatedAt") SELECT "algorithm", "createdAt", "description", "id", "isPublic", "masteredCount", "shareCode", "title", "updatedAt" FROM "FlashcardDeck";
DROP TABLE "FlashcardDeck";
ALTER TABLE "new_FlashcardDeck" RENAME TO "FlashcardDeck";
CREATE UNIQUE INDEX "FlashcardDeck_shareCode_key" ON "FlashcardDeck"("shareCode");
CREATE TABLE "new_LearningGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "subjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningGoal_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LearningGoal" ("createdAt", "description", "id", "priority", "status", "targetDate", "title", "updatedAt") SELECT "createdAt", "description", "id", "priority", "status", "targetDate", "title", "updatedAt" FROM "LearningGoal";
DROP TABLE "LearningGoal";
ALTER TABLE "new_LearningGoal" RENAME TO "LearningGoal";
CREATE TABLE "new_StudyContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "url" TEXT,
    "duration" INTEGER,
    "author" TEXT,
    "source" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "progress" REAL NOT NULL DEFAULT 0,
    "subjectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyContent_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ContentType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudyContent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudyContent" ("author", "createdAt", "duration", "id", "isCompleted", "progress", "source", "title", "typeId", "updatedAt", "url") SELECT "author", "createdAt", "duration", "id", "isCompleted", "progress", "source", "title", "typeId", "updatedAt", "url" FROM "StudyContent";
DROP TABLE "StudyContent";
ALTER TABLE "new_StudyContent" RENAME TO "StudyContent";
CREATE TABLE "new_StudyNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "subjectId" TEXT,
    "contentId" TEXT,
    "sessionId" TEXT,
    "lastReviewed" DATETIME,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyNote_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "StudyContent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StudyNote" ("content", "contentId", "createdAt", "id", "isFavorite", "lastReviewed", "reviewCount", "sessionId", "summary", "tags", "title", "updatedAt") SELECT "content", "contentId", "createdAt", "id", "isFavorite", "lastReviewed", "reviewCount", "sessionId", "summary", "tags", "title", "updatedAt" FROM "StudyNote";
DROP TABLE "StudyNote";
ALTER TABLE "new_StudyNote" RENAME TO "StudyNote";
CREATE TABLE "new_StudySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "durationMinutes" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "focusLevel" INTEGER NOT NULL DEFAULT 3,
    "notesRaw" TEXT,
    "subjectId" TEXT NOT NULL,
    CONSTRAINT "StudySession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudySession" ("date", "durationMinutes", "focusLevel", "id", "notesRaw") SELECT "date", "durationMinutes", "focusLevel", "id", "notesRaw" FROM "StudySession";
DROP TABLE "StudySession";
ALTER TABLE "new_StudySession" RENAME TO "StudySession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
