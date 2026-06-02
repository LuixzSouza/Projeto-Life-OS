-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "bio" TEXT,
    "salary" DECIMAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" DATETIME,
    "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 60,
    "badges" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudySubject_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StudySubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudySubject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyContent" (
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
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyContent_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ContentType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudyContent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudyContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "durationMinutes" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "focusLevel" INTEGER NOT NULL DEFAULT 3,
    "notesRaw" TEXT,
    "subjectId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "StudySession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyNote" (
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
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyNote_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "StudyContent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "subjectId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningGoal_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "StudySubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LearningGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "goalId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningTask_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "LearningGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearningTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlashcardDeck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'LEITNER',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareCode" TEXT,
    "masteredCount" INTEGER NOT NULL DEFAULT 0,
    "studySubjectId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FlashcardDeck_studySubjectId_fkey" FOREIGN KEY ("studySubjectId") REFERENCES "StudySubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FlashcardDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "imageUrl" TEXT,
    "box" INTEGER NOT NULL DEFAULT 1,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "nextReview" DATETIME,
    "lastReviewed" DATETIME,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "deckId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Flashcard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "balance" DECIMAL NOT NULL DEFAULT 0.00,
    "color" TEXT DEFAULT '#000000',
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "externalId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "saved" DECIMAL NOT NULL DEFAULT 0.00,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "imageUrl" TEXT,
    "productUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SAVING',
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "color" TEXT DEFAULT '#6366f1',
    "userId" TEXT,
    "clientId" TEXT,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "rawNotes" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,
    "image" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Meeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
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
    "order" REAL NOT NULL DEFAULT 0,
    "userId" TEXT,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "jobUrl" TEXT,
    "salary" TEXT,
    "location" TEXT,
    "requirements" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "followUpDate" DATETIME,
    "priority" TEXT,
    "type" TEXT NOT NULL DEFAULT 'JOB',
    "appliedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,
    CONSTRAINT "JobApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Challenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChallengeCheckin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayIndex" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ChallengeCheckin_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "intensity" TEXT NOT NULL,
    "feeling" TEXT,
    "notes" TEXT,
    "distance" REAL,
    "pace" TEXT,
    "muscleGroup" TEXT,
    "exercises" TEXT,
    "source" TEXT,
    "externalId" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "HealthMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" REAL NOT NULL,
    "height" REAL NOT NULL,
    "gender" TEXT NOT NULL,
    "activity" REAL NOT NULL DEFAULT 1.2,
    "birthDate" DATETIME,
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

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "calories" INTEGER,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "Meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "mealType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "calories" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "location" TEXT,
    "color" TEXT DEFAULT '#6366f1',
    "emailAlert" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoutineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoutineItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "accentColor" TEXT NOT NULL DEFAULT 'zinc',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "workStart" TEXT NOT NULL DEFAULT '09:00',
    "workEnd" TEXT NOT NULL DEFAULT '18:00',
    "pixKey" TEXT,
    "businessName" TEXT,
    "aiProvider" TEXT NOT NULL DEFAULT 'ollama',
    "aiModel" TEXT NOT NULL DEFAULT 'llama3',
    "aiPersona" TEXT,
    "aiUsage" TEXT,
    "openaiKey" TEXT,
    "groqKey" TEXT,
    "googleKey" TEXT,
    "deepseekKey" TEXT,
    "mistralKey" TEXT,
    "tmdbApiKey" TEXT,
    "rawgApiKey" TEXT,
    "googleBooksApiKey" TEXT,
    "pluggyClientId" TEXT,
    "pluggySecret" TEXT,
    "foodApiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "storagePath" TEXT DEFAULT 'D:/LifeOS_Data',
    "updatedAt" DATETIME NOT NULL,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "autoLockMinutes" INTEGER NOT NULL DEFAULT 15,
    "privacyMode" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManagedSite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "apiKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "ManagedSite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SitePage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "SitePage_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ManagedSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SitePage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiChat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Nova Conversa',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "AiChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "chatId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "AiMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "AiChat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "url" TEXT,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "client_name" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccessItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLAN_TO_WATCH',
    "subtitle" TEXT,
    "coverUrl" TEXT,
    "category" TEXT,
    "creator" TEXT,
    "releaseYear" TEXT,
    "externalId" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Friend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "tags" TEXT,
    "birthday" DATETIME,
    "instagram" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "jobTitle" TEXT,
    "company" TEXT,
    "proximity" TEXT NOT NULL DEFAULT 'CASUAL',
    "pixKey" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "giftIdeas" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Friend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WardrobeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "brand" TEXT,
    "color" TEXT,
    "size" TEXT,
    "category" TEXT NOT NULL,
    "season" TEXT,
    "price" DECIMAL,
    "wearCount" INTEGER NOT NULL DEFAULT 0,
    "lastWorn" DATETIME,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'IN_CLOSET',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WardrobeItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "imageUrl" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "document" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "friendId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "Friend" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalValue" DECIMAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ONE_OFF',
    "installments" INTEGER NOT NULL DEFAULT 1,
    "billingDay" INTEGER,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRemindedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Billing_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Billing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "billingId" TEXT NOT NULL,
    "linkUrl" TEXT,
    "transactionId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "Billing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "BackupLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentType_name_key" ON "ContentType"("name");

-- CreateIndex
CREATE INDEX "StudySubject_userId_idx" ON "StudySubject"("userId");

-- CreateIndex
CREATE INDEX "StudyContent_userId_idx" ON "StudyContent"("userId");

-- CreateIndex
CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");

-- CreateIndex
CREATE INDEX "StudyNote_userId_idx" ON "StudyNote"("userId");

-- CreateIndex
CREATE INDEX "LearningGoal_userId_idx" ON "LearningGoal"("userId");

-- CreateIndex
CREATE INDEX "LearningTask_userId_idx" ON "LearningTask"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardDeck_shareCode_key" ON "FlashcardDeck"("shareCode");

-- CreateIndex
CREATE INDEX "FlashcardDeck_userId_idx" ON "FlashcardDeck"("userId");

-- CreateIndex
CREATE INDEX "Flashcard_userId_idx" ON "Flashcard"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "RecurringExpense_userId_idx" ON "RecurringExpense"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Meeting_userId_idx" ON "Meeting"("userId");

-- CreateIndex
CREATE INDEX "Meeting_projectId_idx" ON "Meeting"("projectId");

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_key" ON "Portfolio"("userId");

-- CreateIndex
CREATE INDEX "Challenge_userId_idx" ON "Challenge"("userId");

-- CreateIndex
CREATE INDEX "ChallengeCheckin_userId_idx" ON "ChallengeCheckin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeCheckin_challengeId_dayIndex_key" ON "ChallengeCheckin"("challengeId", "dayIndex");

-- CreateIndex
CREATE INDEX "Workout_userId_idx" ON "Workout"("userId");

-- CreateIndex
CREATE INDEX "HealthMetric_userId_idx" ON "HealthMetric"("userId");

-- CreateIndex
CREATE INDEX "BodyMeasurement_date_idx" ON "BodyMeasurement"("date");

-- CreateIndex
CREATE INDEX "Meal_userId_idx" ON "Meal"("userId");

-- CreateIndex
CREATE INDEX "MealPlan_userId_dayOfWeek_idx" ON "MealPlan"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "Event"("userId");

-- CreateIndex
CREATE INDEX "RoutineItem_userId_idx" ON "RoutineItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedSite_apiKey_key" ON "ManagedSite"("apiKey");

-- CreateIndex
CREATE INDEX "ManagedSite_userId_idx" ON "ManagedSite"("userId");

-- CreateIndex
CREATE INDEX "SitePage_userId_idx" ON "SitePage"("userId");

-- CreateIndex
CREATE INDEX "AiChat_userId_idx" ON "AiChat"("userId");

-- CreateIndex
CREATE INDEX "AiMessage_userId_idx" ON "AiMessage"("userId");

-- CreateIndex
CREATE INDEX "SavedLink_userId_idx" ON "SavedLink"("userId");

-- CreateIndex
CREATE INDEX "Client_friendId_idx" ON "Client"("friendId");

-- CreateIndex
CREATE INDEX "Billing_userId_idx" ON "Billing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_transactionId_key" ON "Invoice"("transactionId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "BackupLog_userId_idx" ON "BackupLog"("userId");

