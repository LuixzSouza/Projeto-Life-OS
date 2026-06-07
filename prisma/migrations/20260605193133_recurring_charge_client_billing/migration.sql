-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecurringCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Cobrança',
    "clientName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "billingId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringCharge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecurringCharge_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "Billing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecurringCharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RecurringCharge" ("active", "amount", "category", "clientName", "createdAt", "dayOfMonth", "id", "title", "updatedAt", "userId") SELECT "active", "amount", "category", "clientName", "createdAt", "dayOfMonth", "id", "title", "updatedAt", "userId" FROM "RecurringCharge";
DROP TABLE "RecurringCharge";
ALTER TABLE "new_RecurringCharge" RENAME TO "RecurringCharge";
CREATE INDEX "RecurringCharge_userId_idx" ON "RecurringCharge"("userId");
CREATE INDEX "RecurringCharge_userId_active_idx" ON "RecurringCharge"("userId", "active");
CREATE INDEX "RecurringCharge_clientId_idx" ON "RecurringCharge"("clientId");
CREATE INDEX "RecurringCharge_billingId_idx" ON "RecurringCharge"("billingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
