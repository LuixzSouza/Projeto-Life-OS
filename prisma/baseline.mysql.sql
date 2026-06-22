-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` LONGTEXT NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
    `tokenVersion` INTEGER NOT NULL DEFAULT 0,
    `avatarUrl` LONGTEXT NULL,
    `coverUrl` LONGTEXT NULL,
    `bio` LONGTEXT NULL,
    `salary` DECIMAL(65, 30) NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserStats` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `lastStudyDate` DATETIME(3) NULL,
    `dailyGoalMinutes` INTEGER NOT NULL DEFAULT 60,
    `badges` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserStats_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` LONGTEXT NULL,
    `color` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ContentType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudySubject` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `category` LONGTEXT NULL,
    `color` VARCHAR(191) NULL DEFAULT 'blue',
    `icon` LONGTEXT NULL,
    `difficulty` INTEGER NOT NULL DEFAULT 3,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `goalMinutes` INTEGER NOT NULL DEFAULT 3600,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudySubject_userId_idx`(`userId`),
    INDEX `StudySubject_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyContent` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `typeId` VARCHAR(191) NOT NULL,
    `url` LONGTEXT NULL,
    `duration` INTEGER NULL,
    `author` LONGTEXT NULL,
    `source` LONGTEXT NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `subjectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudyContent_userId_idx`(`userId`),
    INDEX `StudyContent_subjectId_idx`(`subjectId`),
    INDEX `StudyContent_typeId_idx`(`typeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudySession` (
    `id` VARCHAR(191) NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `focusLevel` INTEGER NOT NULL DEFAULT 3,
    `notesRaw` LONGTEXT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StudySession_userId_idx`(`userId`),
    INDEX `StudySession_subjectId_idx`(`subjectId`),
    INDEX `StudySession_userId_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyNote` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `content` LONGTEXT NOT NULL,
    `summary` LONGTEXT NULL,
    `tags` LONGTEXT NULL,
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    `notebookId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `subjectId` VARCHAR(191) NULL,
    `contentId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `lastReviewed` DATETIME(3) NULL,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `userId` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudyNote_userId_idx`(`userId`),
    INDEX `StudyNote_subjectId_idx`(`subjectId`),
    INDEX `StudyNote_notebookId_idx`(`notebookId`),
    INDEX `StudyNote_projectId_idx`(`projectId`),
    INDEX `StudyNote_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoteImage` (
    `id` VARCHAR(191) NOT NULL,
    `mime` LONGTEXT NOT NULL,
    `data` LONGTEXT NOT NULL,
    `noteId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NoteImage_noteId_idx`(`noteId`),
    INDEX `NoteImage_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notebook` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `color` VARCHAR(191) NULL DEFAULT '#6366f1',
    `icon` LONGTEXT NULL,
    `isInbox` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL DEFAULT 0,
    `paraType` LONGTEXT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notebook_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyNoteVersion` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `content` LONGTEXT NOT NULL,
    `noteId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StudyNoteVersion_noteId_createdAt_idx`(`noteId`, `createdAt`),
    INDEX `StudyNoteVersion_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LearningGoal` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `description` LONGTEXT NULL,
    `targetDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'IN_PROGRESS',
    `priority` INTEGER NOT NULL DEFAULT 3,
    `subjectId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LearningGoal_userId_idx`(`userId`),
    INDEX `LearningGoal_subjectId_idx`(`subjectId`),
    INDEX `LearningGoal_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LearningTask` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `isDone` BOOLEAN NOT NULL DEFAULT false,
    `orderIndex` INTEGER NOT NULL DEFAULT 0,
    `goalId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LearningTask_userId_idx`(`userId`),
    INDEX `LearningTask_goalId_idx`(`goalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FlashcardDeck` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `description` LONGTEXT NULL,
    `algorithm` VARCHAR(191) NOT NULL DEFAULT 'LEITNER',
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `shareCode` VARCHAR(191) NULL,
    `masteredCount` INTEGER NOT NULL DEFAULT 0,
    `studySubjectId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FlashcardDeck_shareCode_key`(`shareCode`),
    INDEX `FlashcardDeck_userId_idx`(`userId`),
    INDEX `FlashcardDeck_studySubjectId_idx`(`studySubjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Flashcard` (
    `id` VARCHAR(191) NOT NULL,
    `term` LONGTEXT NOT NULL,
    `definition` LONGTEXT NOT NULL,
    `imageUrl` LONGTEXT NULL,
    `hint` LONGTEXT NULL,
    `box` INTEGER NOT NULL DEFAULT 1,
    `easeFactor` DOUBLE NOT NULL DEFAULT 2.5,
    `interval` INTEGER NOT NULL DEFAULT 0,
    `nextReview` DATETIME(3) NULL,
    `lastReviewed` DATETIME(3) NULL,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `deckId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Flashcard_userId_idx`(`userId`),
    INDEX `Flashcard_deckId_idx`(`deckId`),
    INDEX `Flashcard_userId_nextReview_idx`(`userId`, `nextReview`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `type` LONGTEXT NOT NULL,
    `balance` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `color` VARCHAR(191) NULL DEFAULT '#000000',
    `isConnected` BOOLEAN NOT NULL DEFAULT false,
    `provider` LONGTEXT NULL,
    `externalId` LONGTEXT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Account_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `type` LONGTEXT NOT NULL,
    `category` LONGTEXT NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `accountId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Transaction_userId_idx`(`userId`),
    INDEX `Transaction_accountId_idx`(`accountId`),
    INDEX `Transaction_categoryId_idx`(`categoryId`),
    INDEX `Transaction_userId_date_idx`(`userId`, `date`),
    INDEX `Transaction_userId_deletedAt_date_idx`(`userId`, `deletedAt`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecurringExpense` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `dayOfMonth` INTEGER NOT NULL,
    `category` LONGTEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `frequency` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `installments` INTEGER NULL,
    `paidInstallments` INTEGER NOT NULL DEFAULT 0,
    `categoryId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RecurringExpense_userId_idx`(`userId`),
    INDEX `RecurringExpense_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecurringExpensePayment` (
    `id` VARCHAR(191) NOT NULL,
    `recurringExpenseId` VARCHAR(191) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `transactionId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RecurringExpensePayment_transactionId_key`(`transactionId`),
    INDEX `RecurringExpensePayment_userId_idx`(`userId`),
    INDEX `RecurringExpensePayment_recurringExpenseId_idx`(`recurringExpenseId`),
    UNIQUE INDEX `RecurringExpensePayment_recurringExpenseId_dueDate_key`(`recurringExpenseId`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecurringCharge` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `dayOfMonth` INTEGER NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'Cobrança',
    `clientName` LONGTEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `frequency` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `installments` INTEGER NULL,
    `paidInstallments` INTEGER NOT NULL DEFAULT 0,
    `clientId` VARCHAR(191) NULL,
    `billingId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RecurringCharge_userId_idx`(`userId`),
    INDEX `RecurringCharge_userId_active_idx`(`userId`, `active`),
    INDEX `RecurringCharge_clientId_idx`(`clientId`),
    INDEX `RecurringCharge_billingId_idx`(`billingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WishlistItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `price` DECIMAL(65, 30) NOT NULL,
    `saved` DECIMAL(65, 30) NOT NULL DEFAULT 0.00,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
    `imageUrl` LONGTEXT NULL,
    `productUrl` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SAVING',
    `userId` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WishlistItem_userId_idx`(`userId`),
    INDEX `WishlistItem_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'EXPENSE',
    `color` VARCHAR(191) NULL DEFAULT '#6366f1',
    `icon` LONGTEXT NULL,
    `monthlyBudget` DECIMAL(65, 30) NULL,
    `parentId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Category_userId_idx`(`userId`),
    INDEX `Category_parentId_idx`(`parentId`),
    UNIQUE INDEX `Category_userId_name_type_key`(`userId`, `name`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `notes` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `color` VARCHAR(191) NULL DEFAULT '#6366f1',
    `paraType` LONGTEXT NULL,
    `dueDate` DATETIME(3) NULL,
    `userId` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Project_slug_key`(`slug`),
    INDEX `Project_userId_idx`(`userId`),
    INDEX `Project_clientId_idx`(`clientId`),
    INDEX `Project_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Meeting` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `rawNotes` VARCHAR(191) NOT NULL DEFAULT '',
    `summary` LONGTEXT NULL,
    `image` LONGTEXT NULL,
    `images` LONGTEXT NULL,
    `participants` LONGTEXT NULL,
    `tags` LONGTEXT NULL,
    `decisions` LONGTEXT NULL,
    `projectId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Meeting_userId_idx`(`userId`),
    INDEX `Meeting_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `description` LONGTEXT NULL,
    `isDone` BOOLEAN NOT NULL DEFAULT false,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'LOW',
    `status` VARCHAR(191) NOT NULL DEFAULT 'TODO',
    `dueDate` DATETIME(3) NULL,
    `image` LONGTEXT NULL,
    `projectId` VARCHAR(191) NULL,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `isStarred` BOOLEAN NOT NULL DEFAULT false,
    `twoMin` BOOLEAN NOT NULL DEFAULT false,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `estimatedTime` INTEGER NULL,
    `checklist` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `order` DOUBLE NOT NULL DEFAULT 0,
    `userId` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Task_userId_idx`(`userId`),
    INDEX `Task_projectId_idx`(`projectId`),
    INDEX `Task_userId_isDone_idx`(`userId`, `isDone`),
    INDEX `Task_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobApplication` (
    `id` VARCHAR(191) NOT NULL,
    `company` LONGTEXT NOT NULL,
    `role` LONGTEXT NOT NULL,
    `status` LONGTEXT NOT NULL,
    `jobUrl` LONGTEXT NULL,
    `salary` LONGTEXT NULL,
    `location` LONGTEXT NULL,
    `requirements` LONGTEXT NULL,
    `contactName` LONGTEXT NULL,
    `contactEmail` LONGTEXT NULL,
    `followUpDate` DATETIME(3) NULL,
    `priority` LONGTEXT NULL,
    `coverLetter` LONGTEXT NULL,
    `matchScore` INTEGER NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'JOB',
    `appliedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,

    INDEX `JobApplication_userId_idx`(`userId`),
    INDEX `JobApplication_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobEvent` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `status` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,

    INDEX `JobEvent_jobId_idx`(`jobId`),
    INDEX `JobEvent_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Portfolio` (
    `id` VARCHAR(191) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Portfolio_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvestmentHolding` (
    `id` VARCHAR(191) NOT NULL,
    `ticker` LONGTEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'STOCK',
    `quantity` DECIMAL(65, 30) NOT NULL,
    `avgPrice` DECIMAL(65, 30) NOT NULL,
    `note` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `InvestmentHolding_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Challenge` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `description` LONGTEXT NULL,
    `category` LONGTEXT NULL,
    `durationDays` INTEGER NOT NULL DEFAULT 30,
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `color` LONGTEXT NULL,
    `icon` LONGTEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,

    INDEX `Challenge_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChallengeCheckin` (
    `id` VARCHAR(191) NOT NULL,
    `dayIndex` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` LONGTEXT NULL,
    `challengeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `ChallengeCheckin_userId_idx`(`userId`),
    UNIQUE INDEX `ChallengeCheckin_challengeId_dayIndex_key`(`challengeId`, `dayIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Workout` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `type` LONGTEXT NOT NULL,
    `duration` INTEGER NOT NULL,
    `intensity` LONGTEXT NOT NULL,
    `feeling` LONGTEXT NULL,
    `notes` LONGTEXT NULL,
    `distance` DOUBLE NULL,
    `pace` LONGTEXT NULL,
    `terrain` LONGTEXT NULL,
    `shoeName` LONGTEXT NULL,
    `muscleGroup` LONGTEXT NULL,
    `exercises` LONGTEXT NULL,
    `source` LONGTEXT NULL,
    `externalId` LONGTEXT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,

    INDEX `Workout_userId_idx`(`userId`),
    INDEX `Workout_userId_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shoe` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `maxDistance` DOUBLE NULL,
    `retired` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Shoe_userId_idx`(`userId`),
    UNIQUE INDEX `Shoe_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkoutPlan` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `goal` VARCHAR(191) NOT NULL DEFAULT 'general',
    `content` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NULL,

    INDEX `WorkoutPlan_userId_idx`(`userId`),
    INDEX `WorkoutPlan_userId_updatedAt_idx`(`userId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkoutPhoto` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `workoutId` LONGTEXT NULL,
    `dataUrl` LONGTEXT NOT NULL,
    `title` LONGTEXT NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `volume` INTEGER NULL,
    `durationMin` INTEGER NULL,
    `sets` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WorkoutPhoto_userId_idx`(`userId`),
    INDEX `WorkoutPhoto_userId_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EnergyCheckin` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `energy` INTEGER NOT NULL,
    `mood` INTEGER NULL,
    `note` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EnergyCheckin_userId_date_idx`(`userId`, `date`),
    UNIQUE INDEX `EnergyCheckin_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Habit` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `icon` LONGTEXT NULL,
    `color` LONGTEXT NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Habit_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HabitLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `habitId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `status` LONGTEXT NOT NULL,
    `reason` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HabitLog_userId_date_idx`(`userId`, `date`),
    INDEX `HabitLog_habitId_idx`(`habitId`),
    UNIQUE INDEX `HabitLog_habitId_date_key`(`habitId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthMetric` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,

    INDEX `HealthMetric_userId_idx`(`userId`),
    INDEX `HealthMetric_userId_type_date_idx`(`userId`, `type`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BodyMeasurement` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `weight` DOUBLE NOT NULL,
    `height` DOUBLE NOT NULL,
    `gender` LONGTEXT NOT NULL,
    `activity` DOUBLE NOT NULL DEFAULT 1.2,
    `birthDate` DATETIME(3) NULL,
    `neck` DOUBLE NULL,
    `waist` DOUBLE NULL,
    `hip` DOUBLE NULL,
    `shoulders` DOUBLE NULL,
    `chest` DOUBLE NULL,
    `armLeft` DOUBLE NULL,
    `armRight` DOUBLE NULL,
    `forearmLeft` DOUBLE NULL,
    `forearmRight` DOUBLE NULL,
    `thighLeft` DOUBLE NULL,
    `thighRight` DOUBLE NULL,
    `calfLeft` DOUBLE NULL,
    `calfRight` DOUBLE NULL,
    `userId` VARCHAR(191) NULL,

    INDEX `BodyMeasurement_userId_idx`(`userId`),
    INDEX `BodyMeasurement_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Meal` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `items` LONGTEXT NOT NULL,
    `calories` INTEGER NULL,
    `protein` DOUBLE NULL,
    `carbs` DOUBLE NULL,
    `fat` DOUBLE NULL,
    `type` LONGTEXT NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,

    INDEX `Meal_userId_idx`(`userId`),
    INDEX `Meal_userId_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MealPlan` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `mealType` LONGTEXT NOT NULL,
    `title` LONGTEXT NOT NULL,
    `items` LONGTEXT NOT NULL,
    `calories` INTEGER NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MealPlan_userId_dayOfWeek_idx`(`userId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NULL,
    `isAllDay` BOOLEAN NOT NULL DEFAULT false,
    `description` LONGTEXT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'general',
    `location` LONGTEXT NULL,
    `color` VARCHAR(191) NULL DEFAULT '#6366f1',
    `emailAlert` BOOLEAN NOT NULL DEFAULT true,
    `frequency` LONGTEXT NULL,
    `recurrenceEnd` DATETIME(3) NULL,
    `recurrenceExceptions` LONGTEXT NULL,
    `projectId` VARCHAR(191) NULL,
    `taskId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Event_userId_idx`(`userId`),
    INDEX `Event_projectId_idx`(`projectId`),
    INDEX `Event_taskId_idx`(`taskId`),
    INDEX `Event_userId_startTime_idx`(`userId`, `startTime`),
    INDEX `Event_userId_deletedAt_startTime_idx`(`userId`, `deletedAt`, `startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoutineItem` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `startTime` LONGTEXT NOT NULL,
    `endTime` LONGTEXT NOT NULL,
    `description` LONGTEXT NULL,
    `category` LONGTEXT NOT NULL,
    `daysOfWeek` LONGTEXT NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoutineItem_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThemedDay` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `name` LONGTEXT NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#6366f1',
    `icon` LONGTEXT NULL,
    `focus` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ThemedDay_userId_idx`(`userId`),
    UNIQUE INDEX `ThemedDay_userId_weekday_key`(`userId`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FocusSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `label` LONGTEXT NULL,
    `minutes` INTEGER NOT NULL,
    `mode` VARCHAR(191) NOT NULL DEFAULT 'POMODORO',
    `cycles` INTEGER NOT NULL DEFAULT 1,
    `taskId` LONGTEXT NULL,
    `eventId` LONGTEXT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FocusSession_userId_idx`(`userId`),
    INDEX `FocusSession_userId_endedAt_idx`(`userId`, `endedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Settings` (
    `id` VARCHAR(191) NOT NULL,
    `theme` VARCHAR(191) NOT NULL DEFAULT 'system',
    `accentColor` VARCHAR(191) NOT NULL DEFAULT 'zinc',
    `language` VARCHAR(191) NOT NULL DEFAULT 'pt-BR',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `workStart` VARCHAR(191) NOT NULL DEFAULT '09:00',
    `workEnd` VARCHAR(191) NOT NULL DEFAULT '18:00',
    `reminderLeadMinutes` INTEGER NOT NULL DEFAULT 30,
    `pixKey` LONGTEXT NULL,
    `businessName` LONGTEXT NULL,
    `aiProvider` VARCHAR(191) NOT NULL DEFAULT 'ollama',
    `aiModel` VARCHAR(191) NOT NULL DEFAULT 'llama3',
    `aiPersona` LONGTEXT NULL,
    `aiUsage` LONGTEXT NULL,
    `aiBriefing` LONGTEXT NULL,
    `aiWebAccess` BOOLEAN NOT NULL DEFAULT false,
    `aiPrivacyRouting` BOOLEAN NOT NULL DEFAULT false,
    `aiCostRouting` BOOLEAN NOT NULL DEFAULT false,
    `aiVoiceReply` BOOLEAN NOT NULL DEFAULT false,
    `openaiKey` LONGTEXT NULL,
    `groqKey` LONGTEXT NULL,
    `googleKey` LONGTEXT NULL,
    `deepseekKey` LONGTEXT NULL,
    `mistralKey` LONGTEXT NULL,
    `anthropicKey` LONGTEXT NULL,
    `xaiKey` LONGTEXT NULL,
    `openrouterKey` LONGTEXT NULL,
    `tmdbApiKey` LONGTEXT NULL,
    `rawgApiKey` LONGTEXT NULL,
    `googleBooksApiKey` LONGTEXT NULL,
    `pluggyClientId` LONGTEXT NULL,
    `pluggySecret` LONGTEXT NULL,
    `brapiToken` LONGTEXT NULL,
    `marketWatchlist` LONGTEXT NULL,
    `foodApiEnabled` BOOLEAN NOT NULL DEFAULT true,
    `sleepGoalHours` DOUBLE NULL,
    `calorieGoalOverride` INTEGER NULL,
    `storagePath` VARCHAR(191) NULL DEFAULT 'D:/LifeOS_Data',
    `updatedAt` DATETIME(3) NOT NULL,
    `onboardingCompleted` BOOLEAN NOT NULL DEFAULT false,
    `autoLockMinutes` INTEGER NOT NULL DEFAULT 15,
    `privacyMode` BOOLEAN NOT NULL DEFAULT false,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Settings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManagedSite` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `url` LONGTEXT NULL,
    `apiKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,

    UNIQUE INDEX `ManagedSite_apiKey_key`(`apiKey`),
    INDEX `ManagedSite_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SitePage` (
    `id` VARCHAR(191) NOT NULL,
    `slug` LONGTEXT NOT NULL,
    `content` LONGTEXT NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NULL,

    INDEX `SitePage_userId_idx`(`userId`),
    INDEX `SitePage_siteId_idx`(`siteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiChat` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT 'Nova Conversa',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,

    INDEX `AiChat_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiMessage` (
    `id` VARCHAR(191) NOT NULL,
    `role` LONGTEXT NOT NULL,
    `content` LONGTEXT NOT NULL,
    `provider` LONGTEXT NULL,
    `model` LONGTEXT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,

    INDEX `AiMessage_userId_idx`(`userId`),
    INDEX `AiMessage_chatId_idx`(`chatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiMemory` (
    `id` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,

    INDEX `AiMemory_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiAutomation` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `prompt` LONGTEXT NOT NULL,
    `schedule` LONGTEXT NOT NULL,
    `hour` INTEGER NOT NULL DEFAULT 8,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `lastRunAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,

    INDEX `AiAutomation_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiEmbedding` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `text` LONGTEXT NOT NULL,
    `vector` LONGTEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `AiEmbedding_userId_entityType_idx`(`userId`, `entityType`),
    UNIQUE INDEX `AiEmbedding_userId_entityType_entityId_key`(`userId`, `entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccessItem` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `username` LONGTEXT NULL,
    `password` LONGTEXT NOT NULL,
    `url` LONGTEXT NULL,
    `category` LONGTEXT NOT NULL,
    `notes` LONGTEXT NULL,
    `client_name` LONGTEXT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AccessItem_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SavedLink` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `url` LONGTEXT NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` LONGTEXT NULL,
    `category` LONGTEXT NULL,
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    `paraType` LONGTEXT NULL,
    `userId` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SavedLink_userId_idx`(`userId`),
    INDEX `SavedLink_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaItem` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `title` LONGTEXT NOT NULL,
    `type` LONGTEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PLAN_TO_WATCH',
    `subtitle` LONGTEXT NULL,
    `coverUrl` LONGTEXT NULL,
    `category` LONGTEXT NULL,
    `creator` LONGTEXT NULL,
    `releaseYear` LONGTEXT NULL,
    `externalId` LONGTEXT NULL,
    `rating` INTEGER NOT NULL DEFAULT 0,
    `notes` LONGTEXT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MediaItem_userId_idx`(`userId`),
    INDEX `MediaItem_userId_status_idx`(`userId`, `status`),
    INDEX `MediaItem_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Friend` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `nickname` LONGTEXT NULL,
    `email` LONGTEXT NULL,
    `phone` LONGTEXT NULL,
    `tags` LONGTEXT NULL,
    `birthday` DATETIME(3) NULL,
    `instagram` LONGTEXT NULL,
    `linkedin` LONGTEXT NULL,
    `twitter` LONGTEXT NULL,
    `jobTitle` LONGTEXT NULL,
    `company` LONGTEXT NULL,
    `proximity` VARCHAR(191) NOT NULL DEFAULT 'CASUAL',
    `pixKey` LONGTEXT NULL,
    `address` LONGTEXT NULL,
    `notes` LONGTEXT NULL,
    `imageUrl` LONGTEXT NULL,
    `giftIdeas` LONGTEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Friend_userId_idx`(`userId`),
    INDEX `Friend_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WardrobeItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `imageUrl` LONGTEXT NULL,
    `brand` LONGTEXT NULL,
    `color` LONGTEXT NULL,
    `size` LONGTEXT NULL,
    `category` LONGTEXT NOT NULL,
    `season` LONGTEXT NULL,
    `price` DECIMAL(65, 30) NULL,
    `wearCount` INTEGER NOT NULL DEFAULT 0,
    `lastWorn` DATETIME(3) NULL,
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'IN_CLOSET',
    `userId` VARCHAR(191) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WardrobeItem_userId_idx`(`userId`),
    INDEX `WardrobeItem_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NOT NULL,
    `company` LONGTEXT NULL,
    `imageUrl` LONGTEXT NULL,
    `website` LONGTEXT NULL,
    `phone` LONGTEXT NULL,
    `email` LONGTEXT NULL,
    `document` LONGTEXT NULL,
    `address` LONGTEXT NULL,
    `notes` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `friendId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Client_userId_idx`(`userId`),
    INDEX `Client_friendId_idx`(`friendId`),
    INDEX `Client_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Billing` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `description` LONGTEXT NULL,
    `totalValue` DECIMAL(65, 30) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'ONE_OFF',
    `installments` INTEGER NOT NULL DEFAULT 1,
    `billingDay` INTEGER NULL,
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastRemindedAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `clientId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Billing_userId_idx`(`userId`),
    INDEX `Billing_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `value` DECIMAL(65, 30) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `billingId` VARCHAR(191) NOT NULL,
    `linkUrl` LONGTEXT NULL,
    `transactionId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_transactionId_key`(`transactionId`),
    INDEX `Invoice_userId_idx`(`userId`),
    INDEX `Invoice_billingId_idx`(`billingId`),
    INDEX `Invoice_status_idx`(`status`),
    INDEX `Invoice_dueDate_idx`(`dueDate`),
    INDEX `Invoice_userId_status_dueDate_idx`(`userId`, `status`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BackupLog` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fileName` LONGTEXT NOT NULL,
    `path` LONGTEXT NOT NULL,
    `size` LONGTEXT NOT NULL,
    `type` LONGTEXT NOT NULL,
    `userId` VARCHAR(191) NULL,

    INDEX `BackupLog_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL DEFAULT '#6366f1',
    `icon` LONGTEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Tag_userId_idx`(`userId`),
    UNIQUE INDEX `Tag_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Taggable` (
    `id` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Taggable_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `Taggable_userId_idx`(`userId`),
    UNIQUE INDEX `Taggable_tagId_entityType_entityId_key`(`tagId`, `entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `type` LONGTEXT NOT NULL,
    `title` LONGTEXT NOT NULL,
    `body` LONGTEXT NULL,
    `entityType` LONGTEXT NULL,
    `entityId` LONGTEXT NULL,
    `actionUrl` LONGTEXT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
    `dueAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_readAt_idx`(`userId`, `readAt`),
    INDEX `Notification_userId_dueAt_idx`(`userId`, `dueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `action` LONGTEXT NOT NULL,
    `module` LONGTEXT NOT NULL,
    `summary` LONGTEXT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `meta` LONGTEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ActivityLog_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(191) NOT NULL,
    `name` LONGTEXT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'IMAGE',
    `url` LONGTEXT NULL,
    `blob` LONGTEXT NULL,
    `mimeType` LONGTEXT NULL,
    `sizeBytes` INTEGER NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Attachment_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `Attachment_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EntityLink` (
    `id` VARCHAR(191) NOT NULL,
    `fromType` VARCHAR(150) NOT NULL,
    `fromId` VARCHAR(150) NOT NULL,
    `toType` VARCHAR(150) NOT NULL,
    `toId` VARCHAR(150) NOT NULL,
    `kind` VARCHAR(150) NOT NULL DEFAULT 'RELATED',
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EntityLink_fromType_fromId_idx`(`fromType`, `fromId`),
    INDEX `EntityLink_toType_toId_idx`(`toType`, `toId`),
    INDEX `EntityLink_userId_idx`(`userId`),
    UNIQUE INDEX `EntityLink_fromType_fromId_toType_toId_kind_key`(`fromType`, `fromId`, `toType`, `toId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserStats` ADD CONSTRAINT `UserStats_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySubject` ADD CONSTRAINT `StudySubject_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `StudySubject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySubject` ADD CONSTRAINT `StudySubject_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyContent` ADD CONSTRAINT `StudyContent_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `ContentType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyContent` ADD CONSTRAINT `StudyContent_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `StudySubject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyContent` ADD CONSTRAINT `StudyContent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySession` ADD CONSTRAINT `StudySession_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `StudySubject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySession` ADD CONSTRAINT `StudySession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyNote` ADD CONSTRAINT `StudyNote_notebookId_fkey` FOREIGN KEY (`notebookId`) REFERENCES `Notebook`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyNote` ADD CONSTRAINT `StudyNote_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyNote` ADD CONSTRAINT `StudyNote_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `StudySubject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyNote` ADD CONSTRAINT `StudyNote_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `StudyContent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyNote` ADD CONSTRAINT `StudyNote_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `StudySession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyNote` ADD CONSTRAINT `StudyNote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoteImage` ADD CONSTRAINT `NoteImage_noteId_fkey` FOREIGN KEY (`noteId`) REFERENCES `StudyNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoteImage` ADD CONSTRAINT `NoteImage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notebook` ADD CONSTRAINT `Notebook_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyNoteVersion` ADD CONSTRAINT `StudyNoteVersion_noteId_fkey` FOREIGN KEY (`noteId`) REFERENCES `StudyNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyNoteVersion` ADD CONSTRAINT `StudyNoteVersion_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningGoal` ADD CONSTRAINT `LearningGoal_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `StudySubject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningGoal` ADD CONSTRAINT `LearningGoal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningTask` ADD CONSTRAINT `LearningTask_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `LearningGoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningTask` ADD CONSTRAINT `LearningTask_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FlashcardDeck` ADD CONSTRAINT `FlashcardDeck_studySubjectId_fkey` FOREIGN KEY (`studySubjectId`) REFERENCES `StudySubject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FlashcardDeck` ADD CONSTRAINT `FlashcardDeck_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flashcard` ADD CONSTRAINT `Flashcard_deckId_fkey` FOREIGN KEY (`deckId`) REFERENCES `FlashcardDeck`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flashcard` ADD CONSTRAINT `Flashcard_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExpense` ADD CONSTRAINT `RecurringExpense_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExpense` ADD CONSTRAINT `RecurringExpense_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExpensePayment` ADD CONSTRAINT `RecurringExpensePayment_recurringExpenseId_fkey` FOREIGN KEY (`recurringExpenseId`) REFERENCES `RecurringExpense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExpensePayment` ADD CONSTRAINT `RecurringExpensePayment_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExpensePayment` ADD CONSTRAINT `RecurringExpensePayment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringCharge` ADD CONSTRAINT `RecurringCharge_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringCharge` ADD CONSTRAINT `RecurringCharge_billingId_fkey` FOREIGN KEY (`billingId`) REFERENCES `Billing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringCharge` ADD CONSTRAINT `RecurringCharge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishlistItem` ADD CONSTRAINT `WishlistItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Meeting` ADD CONSTRAINT `Meeting_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Meeting` ADD CONSTRAINT `Meeting_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobApplication` ADD CONSTRAINT `JobApplication_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobApplication` ADD CONSTRAINT `JobApplication_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobEvent` ADD CONSTRAINT `JobEvent_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `JobApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobEvent` ADD CONSTRAINT `JobEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Portfolio` ADD CONSTRAINT `Portfolio_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestmentHolding` ADD CONSTRAINT `InvestmentHolding_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Challenge` ADD CONSTRAINT `Challenge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChallengeCheckin` ADD CONSTRAINT `ChallengeCheckin_challengeId_fkey` FOREIGN KEY (`challengeId`) REFERENCES `Challenge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChallengeCheckin` ADD CONSTRAINT `ChallengeCheckin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Workout` ADD CONSTRAINT `Workout_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shoe` ADD CONSTRAINT `Shoe_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkoutPlan` ADD CONSTRAINT `WorkoutPlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkoutPhoto` ADD CONSTRAINT `WorkoutPhoto_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EnergyCheckin` ADD CONSTRAINT `EnergyCheckin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Habit` ADD CONSTRAINT `Habit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HabitLog` ADD CONSTRAINT `HabitLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HabitLog` ADD CONSTRAINT `HabitLog_habitId_fkey` FOREIGN KEY (`habitId`) REFERENCES `Habit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthMetric` ADD CONSTRAINT `HealthMetric_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BodyMeasurement` ADD CONSTRAINT `BodyMeasurement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Meal` ADD CONSTRAINT `Meal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MealPlan` ADD CONSTRAINT `MealPlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoutineItem` ADD CONSTRAINT `RoutineItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThemedDay` ADD CONSTRAINT `ThemedDay_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FocusSession` ADD CONSTRAINT `FocusSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Settings` ADD CONSTRAINT `Settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManagedSite` ADD CONSTRAINT `ManagedSite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SitePage` ADD CONSTRAINT `SitePage_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `ManagedSite`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SitePage` ADD CONSTRAINT `SitePage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiChat` ADD CONSTRAINT `AiChat_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiMessage` ADD CONSTRAINT `AiMessage_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `AiChat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiMessage` ADD CONSTRAINT `AiMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiMemory` ADD CONSTRAINT `AiMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiAutomation` ADD CONSTRAINT `AiAutomation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiEmbedding` ADD CONSTRAINT `AiEmbedding_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccessItem` ADD CONSTRAINT `AccessItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedLink` ADD CONSTRAINT `SavedLink_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaItem` ADD CONSTRAINT `MediaItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Friend` ADD CONSTRAINT `Friend_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WardrobeItem` ADD CONSTRAINT `WardrobeItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_friendId_fkey` FOREIGN KEY (`friendId`) REFERENCES `Friend`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Billing` ADD CONSTRAINT `Billing_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Billing` ADD CONSTRAINT `Billing_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_billingId_fkey` FOREIGN KEY (`billingId`) REFERENCES `Billing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BackupLog` ADD CONSTRAINT `BackupLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tag` ADD CONSTRAINT `Tag_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Taggable` ADD CONSTRAINT `Taggable_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Taggable` ADD CONSTRAINT `Taggable_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntityLink` ADD CONSTRAINT `EntityLink_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

