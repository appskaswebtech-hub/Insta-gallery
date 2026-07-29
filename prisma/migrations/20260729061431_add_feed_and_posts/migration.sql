-- CreateTable
CREATE TABLE "InstagramPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "igMediaId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "permalink" TEXT NOT NULL,
    "caption" TEXT,
    "timestamp" DATETIME NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Feed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "postsToShow" TEXT NOT NULL DEFAULT 'own_posts',
    "layout" TEXT NOT NULL DEFAULT 'grid',
    "title" TEXT,
    "onPostClick" TEXT NOT NULL DEFAULT 'popup',
    "postSpacing" TEXT NOT NULL DEFAULT 'small',
    "aspectRatio" TEXT NOT NULL DEFAULT '3:4',
    "roundedCorners" BOOLEAN NOT NULL DEFAULT false,
    "rowsDesktop" INTEGER NOT NULL DEFAULT 2,
    "colsDesktop" INTEGER NOT NULL DEFAULT 4,
    "rowsMobile" INTEGER NOT NULL DEFAULT 2,
    "colsMobile" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "InstagramPost_shop_igMediaId_key" ON "InstagramPost"("shop", "igMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "Feed_shop_key" ON "Feed"("shop");
