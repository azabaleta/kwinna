-- Vaciar calidades globales antes de añadir FK obligatoria
DELETE FROM "Quality";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quality" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemTypeId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Quality_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "ItemType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Quality" ("code", "id", "name") SELECT "code", "id", "name" FROM "Quality";
DROP TABLE "Quality";
ALTER TABLE "new_Quality" RENAME TO "Quality";
CREATE UNIQUE INDEX "Quality_itemTypeId_code_key" ON "Quality"("itemTypeId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
