-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalOrderId" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL,
    "totalAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BYN',
    "status" TEXT,
    "marketplaceAccountId" TEXT NOT NULL,
    CONSTRAINT "Order_marketplaceAccountId_fkey" FOREIGN KEY ("marketplaceAccountId") REFERENCES "UserMarketplaceAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("currency", "externalOrderId", "id", "marketplaceAccountId", "orderDate", "status", "totalAmount") SELECT "currency", "externalOrderId", "id", "marketplaceAccountId", "orderDate", "status", "totalAmount" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_marketplaceAccountId_externalOrderId_key" ON "Order"("marketplaceAccountId", "externalOrderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
