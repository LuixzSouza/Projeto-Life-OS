-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StudyNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "notebookId" TEXT,
    "projectId" TEXT,
    "subjectId" TEXT,
    "contentId" TEXT,
    "sessionId" TEXT,
    "lastReviewed" DATETIME,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyNote_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "StudyContent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudyNote" ("content", "contentId", "createdAt", "deletedAt", "id", "isFavorite", "lastReviewed", "notebookId", "reviewCount", "sessionId", "subjectId", "summary", "tags", "title", "updatedAt", "userId") SELECT "content", "contentId", "createdAt", "deletedAt", "id", "isFavorite", "lastReviewed", "notebookId", "reviewCount", "sessionId", "subjectId", "summary", "tags", "title", "updatedAt", "userId" FROM "StudyNote";
DROP TABLE "StudyNote";
ALTER TABLE "new_StudyNote" RENAME TO "StudyNote";
CREATE INDEX "StudyNote_userId_idx" ON "StudyNote"("userId");
CREATE INDEX "StudyNote_subjectId_idx" ON "StudyNote"("subjectId");
CREATE INDEX "StudyNote_notebookId_idx" ON "StudyNote"("notebookId");
CREATE INDEX "StudyNote_projectId_idx" ON "StudyNote"("projectId");
CREATE INDEX "StudyNote_userId_deletedAt_idx" ON "StudyNote"("userId", "deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
