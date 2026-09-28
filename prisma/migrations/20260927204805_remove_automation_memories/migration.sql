DELETE FROM "Memory" WHERE "kind" = 'AUTOMATION';

-- AlterEnum
BEGIN;
CREATE TYPE "MemoryKind_new" AS ENUM ('GOAL', 'FACT', 'INSIGHT');
ALTER TABLE "Memory" ALTER COLUMN "kind" TYPE "MemoryKind_new" USING ("kind"::text::"MemoryKind_new");
ALTER TYPE "MemoryKind" RENAME TO "MemoryKind_old";
ALTER TYPE "MemoryKind_new" RENAME TO "MemoryKind";
DROP TYPE "MemoryKind_old";
COMMIT;

