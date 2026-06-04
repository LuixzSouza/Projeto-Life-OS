-- CreateIndex
CREATE INDEX "Client_userId_deletedAt_idx" ON "Client"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Event_userId_deletedAt_startTime_idx" ON "Event"("userId", "deletedAt", "startTime");

-- CreateIndex
CREATE INDEX "Friend_userId_deletedAt_idx" ON "Friend"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Invoice_userId_status_dueDate_idx" ON "Invoice"("userId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "LearningGoal_userId_deletedAt_idx" ON "LearningGoal"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "MediaItem_userId_deletedAt_idx" ON "MediaItem"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Project_userId_deletedAt_idx" ON "Project"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "SavedLink_userId_deletedAt_idx" ON "SavedLink"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "StudyNote_userId_deletedAt_idx" ON "StudyNote"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Task_userId_deletedAt_idx" ON "Task"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_deletedAt_date_idx" ON "Transaction"("userId", "deletedAt", "date");

-- CreateIndex
CREATE INDEX "WardrobeItem_userId_deletedAt_idx" ON "WardrobeItem"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_deletedAt_idx" ON "WishlistItem"("userId", "deletedAt");

