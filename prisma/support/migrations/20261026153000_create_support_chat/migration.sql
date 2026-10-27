CREATE TABLE IF NOT EXISTS `SupportThread` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `shopUnreadCount` INTEGER NOT NULL DEFAULT 0,
    `adminUnreadCount` INTEGER NOT NULL DEFAULT 0,
    `shopLastReadAt` DATETIME(3) NULL,
    `adminLastReadAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `adminTypingAt` DATETIME(3) NULL,
    `lastResetAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupportThread_shop_key`(`shop`),
    INDEX `SupportThread_shop_idx`(`shop`),
    PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `SupportMessage` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `sender` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NULL,
    `attachmentUrl` VARCHAR(191) NULL,
    `attachmentName` VARCHAR(191) NULL,
    `attachmentType` VARCHAR(191) NULL,
    `attachmentSize` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupportMessage_threadId_idx`(`threadId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `SupportMessage_threadId_fkey`
        FOREIGN KEY (`threadId`) REFERENCES `SupportThread`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
);
