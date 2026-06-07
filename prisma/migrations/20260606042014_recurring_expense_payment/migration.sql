-- CreateTable
CREATE TABLE "RecurringExpensePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recurringExpenseId" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringExpensePayment_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringExpensePayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecurringExpensePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringExpensePayment_transactionId_key" ON "RecurringExpensePayment"("transactionId");

-- CreateIndex
CREATE INDEX "RecurringExpensePayment_userId_idx" ON "RecurringExpensePayment"("userId");

-- CreateIndex
CREATE INDEX "RecurringExpensePayment_recurringExpenseId_idx" ON "RecurringExpensePayment"("recurringExpenseId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringExpensePayment_recurringExpenseId_dueDate_key" ON "RecurringExpensePayment"("recurringExpenseId", "dueDate");
