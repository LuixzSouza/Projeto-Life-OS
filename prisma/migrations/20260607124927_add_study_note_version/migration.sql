-- CreateTable
CREATE TABLE "StudyNoteVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyNoteVersion_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "StudyNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudyNoteVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StudyNoteVersion_noteId_createdAt_idx" ON "StudyNoteVersion"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "StudyNoteVersion_userId_idx" ON "StudyNoteVersion"("userId");
