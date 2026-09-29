import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
PRAGMA foreign_keys = ON;

-- Every other table hangs off a kindergarten, so more kindergartens can be added later.
CREATE TABLE IF NOT EXISTS kindergartens (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  hours        TEXT,
  phone        TEXT,
  notice       TEXT,
  school_year  TEXT,
  summer_start TEXT
);

CREATE TABLE IF NOT EXISTS classes (
  id              INTEGER PRIMARY KEY,
  kindergarten_id INTEGER NOT NULL REFERENCES kindergartens(id),
  name            TEXT NOT NULL,
  sort            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY,
  kindergarten_id INTEGER NOT NULL REFERENCES kindergartens(id),
  role            TEXT NOT NULL CHECK (role IN ('parent', 'staff')),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS children (
  id       INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  name     TEXT NOT NULL,
  gender   TEXT NOT NULL CHECK (gender IN ('f', 'm'))
);

CREATE TABLE IF NOT EXISTS parent_children (
  parent_id INTEGER NOT NULL REFERENCES users(id),
  child_id  INTEGER NOT NULL REFERENCES children(id),
  PRIMARY KEY (parent_id, child_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_reports (
  child_id     INTEGER NOT NULL REFERENCES children(id),
  date         TEXT NOT NULL,
  absent       INTEGER NOT NULL DEFAULT 0,
  food         TEXT CHECK (food IN ('all', 'most', 'little', 'none')),
  sleep_status TEXT CHECK (sleep_status IN ('slept', 'none')),
  sleep_start  TEXT,
  sleep_end    TEXT,
  poop         TEXT CHECK (poop IN ('yes', 'no')),
  mood         TEXT CHECK (mood IN ('great', 'good', 'hard')),
  highlight    TEXT,
  note         TEXT,
  updated_at   INTEGER,
  updated_by   INTEGER REFERENCES users(id),
  PRIMARY KEY (child_id, date)
);

CREATE TABLE IF NOT EXISTS class_days (
  class_id       INTEGER NOT NULL REFERENCES classes(id),
  date           TEXT NOT NULL,
  menu_breakfast TEXT,
  menu_lunch     TEXT,
  activities     TEXT NOT NULL DEFAULT '[]',
  updated_at     INTEGER,
  PRIMARY KEY (class_id, date)
);

CREATE TABLE IF NOT EXISTS supply_requests (
  id          INTEGER PRIMARY KEY,
  child_id    INTEGER NOT NULL REFERENCES children(id),
  date        TEXT NOT NULL,
  items       TEXT NOT NULL,
  other_text  TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at  INTEGER NOT NULL,
  resolved_at INTEGER,
  UNIQUE (child_id, date)
);

CREATE TABLE IF NOT EXISTS parent_updates (
  id         INTEGER PRIMARY KEY,
  child_id   INTEGER NOT NULL REFERENCES children(id),
  date       TEXT NOT NULL,
  author_id  INTEGER NOT NULL REFERENCES users(id),
  types      TEXT NOT NULL,
  note       TEXT,
  created_at INTEGER NOT NULL,
  seen_at    INTEGER
);

CREATE TABLE IF NOT EXISTS vacations (
  id              INTEGER PRIMARY KEY,
  kindergarten_id INTEGER NOT NULL REFERENCES kindergartens(id),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('holiday', 'staff_day', 'short_day')),
  start_date      TEXT NOT NULL,
  end_date        TEXT NOT NULL,
  return_date     TEXT,
  note            TEXT,
  -- Optional wording overrides, e.g. '11.09 + 13.09' when Shabbat falls inside the range.
  display_date    TEXT,
  weekdays        TEXT
);

CREATE INDEX IF NOT EXISTS idx_vacations_kg ON vacations(kindergarten_id, start_date);
CREATE INDEX IF NOT EXISTS idx_children_class ON children(class_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON daily_reports(date);
CREATE INDEX IF NOT EXISTS idx_supplies_child ON supply_requests(child_id, status);
CREATE INDEX IF NOT EXISTS idx_updates_child_date ON parent_updates(child_id, date);
`;

const SCHEMA_VERSION = 2;

export function openDb(file = process.env.DB_PATH || path.resolve('data/gan.db')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  const version = db.prepare('PRAGMA user_version').get().user_version;
  const hasTables = db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'`).get().n > 0;
  if (hasTables && version !== SCHEMA_VERSION) {
    throw new Error(`Database ${file} uses an older schema. Run \`npm run seed\` to recreate it.`);
  }
  db.exec(SCHEMA);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  return db;
}

/** Run fn inside a transaction; rolls back on throw. */
export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
