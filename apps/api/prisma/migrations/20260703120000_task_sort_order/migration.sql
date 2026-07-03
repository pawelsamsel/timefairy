ALTER TABLE "Task" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "updatedAt" DESC) - 1 AS rn
  FROM "Task"
)
UPDATE "Task" AS t
SET "sortOrder" = ranked.rn
FROM ranked
WHERE t.id = ranked.id;
