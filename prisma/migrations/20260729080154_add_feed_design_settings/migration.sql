-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Feed" (
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
    "showLoadingAnimation" BOOLEAN NOT NULL DEFAULT false,
    "linkToOriginalPost" BOOLEAN NOT NULL DEFAULT false,
    "showSliderPreviews" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Feed" ("aspectRatio", "colsDesktop", "colsMobile", "createdAt", "id", "layout", "onPostClick", "postSpacing", "postsToShow", "roundedCorners", "rowsDesktop", "rowsMobile", "shop", "title", "updatedAt") SELECT "aspectRatio", "colsDesktop", "colsMobile", "createdAt", "id", "layout", "onPostClick", "postSpacing", "postsToShow", "roundedCorners", "rowsDesktop", "rowsMobile", "shop", "title", "updatedAt" FROM "Feed";
DROP TABLE "Feed";
ALTER TABLE "new_Feed" RENAME TO "Feed";
CREATE UNIQUE INDEX "Feed_shop_key" ON "Feed"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
