-- Substitua o conteúdo por:
PRAGMA foreign_keys=OFF;
CREATE TABLE "_Task_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'LOW',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "dueDate" DATETIME,
    "image" TEXT,
    "projectId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "estimatedTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copie os dados existentes
INSERT INTO "_Task_new" ("id", "title", "description", "isDone", "priority", "dueDate", "image", "projectId", "createdAt")
SELECT 
    "id", 
    "title", 
    "description", 
    "isDone", 
    COALESCE("priority", 'LOW'), 
    "dueDate", 
    "image", 
    "projectId",
    "createdAt"
FROM "Task";

-- Defina o updatedAt para o valor de createdAt para linhas existentes
UPDATE "_Task_new" SET "updatedAt" = "createdAt";

-- Substitua a tabela antiga
DROP TABLE "Task";
ALTER TABLE "_Task_new" RENAME TO "Task";

-- Crie índices se necessário
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
PRAGMA foreign_keys=ON;