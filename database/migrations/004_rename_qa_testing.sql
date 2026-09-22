-- Migration 004: Disambiguate the generic "QA Testing" technology
-- Migration 003 introduced specific testing technologies (Test Automation,
-- Exploratory Testing, Performance Testing, ...), which left the original
-- catch-all "QA Testing" entry ambiguous. Renaming it keeps every existing
-- training record attached, because records reference the technology by id.
-- This script is idempotent and safe to re-run.

UPDATE technologies
SET name = 'Manual & Functional Testing'
WHERE name = 'QA Testing'
  AND NOT EXISTS (
    SELECT 1 FROM technologies WHERE name = 'Manual & Functional Testing'
  );
