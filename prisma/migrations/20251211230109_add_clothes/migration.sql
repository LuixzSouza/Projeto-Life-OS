-- CreateTable
CREATE TABLE `WardrobeItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `imageUrl` LONGTEXT NULL,
    `brand` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `size` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `season` VARCHAR(191) NULL,
    `price` DECIMAL(65, 30) NULL,
    `wearCount` INTEGER NOT NULL DEFAULT 0,
    `lastWorn` DATETIME(3) NULL,
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('IN_CLOSET', 'LAUNDRY', 'LENT', 'REPAIR', 'DONATED') NOT NULL DEFAULT 'IN_CLOSET',
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WardrobeItem` ADD CONSTRAINT `WardrobeItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
