CREATE TABLE IF NOT EXISTS projects (
  id         SERIAL PRIMARY KEY,
  account_id INTEGER,
  name       TEXT,
  status     TEXT,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS deals (
  id         SERIAL PRIMARY KEY,
  stage      TEXT,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  account_id INTEGER,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_state (
  key        TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS accounts (
  id         SERIAL PRIMARY KEY,
  name       TEXT,
  platform   TEXT,
  tier       TEXT,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
