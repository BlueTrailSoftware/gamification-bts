-- Migration 003: Seed AI and QA technologies
-- Adds 21 technologies covering AI/agent-related work and QA specializations.
-- Each technology resolves its category by name against the `categories` table,
-- so this must run after 002_normalize_categories.sql.
-- This script is idempotent and safe to re-run.

INSERT INTO technologies (name, category_id)
SELECT seed.name, c.id
FROM (VALUES
  -- AI: knowledge specific to artificial intelligence
  ('Prompt Engineering',              'AI'),
  ('LLM Application Development',     'AI'),
  ('AI Agents',                       'AI'),
  ('Model Context Protocol (MCP)',    'AI'),
  ('RAG & Vector Databases',          'AI'),
  ('Fine-tuning & Model Adaptation',  'AI'),
  -- AI applied to an existing discipline
  ('AI-Assisted Development',         'Programming'),
  ('LLM Evaluation & Testing',        'Testing'),
  ('LLMOps',                          'Operations'),
  ('AI Security & Governance',        'Security'),
  ('Machine Learning Fundamentals',   'Data'),
  -- QA: knowledge specific to testing
  ('Test Automation',                 'Testing'),
  ('API Testing',                     'Testing'),
  ('Performance Testing',             'Testing'),
  ('Mobile Testing',                  'Testing'),
  ('Accessibility Testing',           'Testing'),
  ('Test Strategy & Design',          'Testing'),
  ('Exploratory Testing',             'Testing'),
  -- QA applied to an existing discipline
  ('Security Testing',                'Security'),
  ('Test Data Management',            'Data'),
  ('CI/CD & Test Infrastructure',     'Operations')
) AS seed(name, category_name)
JOIN categories c ON c.name = seed.category_name
ON CONFLICT (name) DO NOTHING;
