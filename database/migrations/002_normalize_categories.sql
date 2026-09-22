-- Migration 002: Normalize technology categories
-- Turns the free-text `technologies.category` column into a real `categories` entity:
-- creates the `categories` table, seeds the known category names, backfills
-- `technologies.category_id` from the existing free-text values (creating any
-- missing category on the fly), enforces NOT NULL + a foreign key, drops the old
-- text column and indexes the new one.
-- This script is idempotent and safe to re-run.

-- ----------------------------------------------------------------------------
-- 1. Categories table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Seed the known categories
-- ----------------------------------------------------------------------------
INSERT INTO categories (name) VALUES
  ('Programming'),
  ('Frontend'),
  ('Backend'),
  ('Testing'),
  ('Operations'),
  ('Infrastructure'),
  ('Data'),
  ('Security'),
  ('AI')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Add the new foreign key column
-- ----------------------------------------------------------------------------
ALTER TABLE technologies ADD COLUMN IF NOT EXISTS category_id UUID;

-- ----------------------------------------------------------------------------
-- 4. Backfill category_id from the legacy free-text column.
--    Any category text that does not match a seeded category is inserted first,
--    so no technology row is left with a NULL category_id.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'technologies' AND column_name = 'category'
  ) THEN
    -- Create any category that only exists as free text on technologies
    EXECUTE $backfill$
      INSERT INTO categories (name)
      SELECT DISTINCT TRIM(t.category)
      FROM technologies t
      WHERE t.category IS NOT NULL
        AND TRIM(t.category) <> ''
      ON CONFLICT (name) DO NOTHING
    $backfill$;

    -- Point every technology at its category
    EXECUTE $link$
      UPDATE technologies t
      SET category_id = c.id
      FROM categories c
      WHERE c.name = TRIM(t.category)
        AND t.category_id IS DISTINCT FROM c.id
    $link$;
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 5. Enforce the relationship
-- ----------------------------------------------------------------------------
ALTER TABLE technologies ALTER COLUMN category_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'technologies_category_id_fkey'
      AND conrelid = 'technologies'::regclass
  ) THEN
    ALTER TABLE technologies
      ADD CONSTRAINT technologies_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 6. Drop the legacy free-text column
-- ----------------------------------------------------------------------------
ALTER TABLE technologies DROP COLUMN IF EXISTS category;

-- ----------------------------------------------------------------------------
-- 7. Index the new foreign key
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_technologies_category_id ON technologies(category_id);
