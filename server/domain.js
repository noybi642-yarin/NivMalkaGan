// Domain rules shared by all routes: dates, validation, report shape, completion.

export const TZ = 'Asia/Jerusalem';

export const FOOD = ['well', 'partial', 'tasted', 'little'];
export const MEALS = ['breakfast', 'lunch', 'snack'];
export const SLEEP = ['great', 'good', 'hard', 'none'];
export const POOP = ['yes', 'no'];
export const MOOD = ['happy', 'calm', 'tired', 'hard'];
export const SUPPLY_ITEMS = ['diapers', 'wipes', 'clothes', 'sheets', 'bottle', 'pacifier', 'other'];
export const PARENT_UPDATE_TYPES = ['bad_night', 'cold', 'early_pickup', 'other_pickup', 'other'];

export const TEXT_LIMIT = 280;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const bad = (msg = 'invalid input') => new HttpError(400, msg);

/** Today's date (YYYY-MM-DD) in Israel, regardless of server timezone. */
export function todayIL(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

export function addDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    throw bad('invalid date');
  }
  return value;
}

export function parseId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw bad('invalid id');
  return n;
}

export function cleanText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw bad('invalid text');
  const trimmed = value.trim();
  if (trimmed.length > TEXT_LIMIT) throw bad('text too long');
  return trimmed || null;
}

function oneOf(value, allowed) {
  if (value === null) return null;
  if (!allowed.includes(value)) throw bad('invalid value');
  return value;
}

function listOf(value, allowed) {
  if (!Array.isArray(value) || value.length > allowed.length) throw bad('invalid list');
  const unique = [...new Set(value)];
  unique.forEach((v) => oneOf(v, allowed));
  return unique;
}
export const parseSupplyItems = (v) => listOf(v, SUPPLY_ITEMS);
export const parseUpdateTypes = (v) => listOf(v, PARENT_UPDATE_TYPES);

/**
 * Converts one API field value into the DB columns it touches.
 * Fields: absent, food, sleep, poop, mood, highlight, note.
 */
export function fieldToColumns(field, value) {
  switch (field) {
    case 'absent':
      if (typeof value !== 'boolean') throw bad('invalid absent');
      return { absent: value ? 1 : 0 };
    case 'food_breakfast':
    case 'food_lunch':
    case 'food_snack':
      return { [field]: oneOf(value, FOOD) };
    case 'sleep_quality':
      return { sleep_quality: oneOf(value, SLEEP) };
    case 'sleep_minutes':
      if (value !== null && !(Number.isInteger(value) && value > 0 && value <= 300)) throw bad('invalid sleep duration');
      return { sleep_minutes: value };
    case 'poop':
      return { poop: oneOf(value, POOP) };
    case 'mood':
      return { mood: oneOf(value, MOOD) };
    case 'highlight':
    case 'note':
      return { [field]: cleanText(value) };
    case 'activities':
      return { activities: value === null ? null : JSON.stringify(parseActivities(value)) };
    default:
      throw bad('unknown field');
  }
}

export const REPORT_FIELDS = [
  'absent', 'mood', 'food_breakfast', 'food_lunch', 'food_snack', 'sleep_quality', 'sleep_minutes',
  'poop', 'highlight', 'note', 'activities',
];

const ACTIVITY_LIMIT = 12;

/** A list of short activity names, deduplicated. */
export function parseActivities(value) {
  if (!Array.isArray(value) || value.length > ACTIVITY_LIMIT) throw bad('invalid activities');
  const list = [...new Set(value.map(cleanText).filter(Boolean))];
  if (list.some((a) => a.length > 40)) throw bad('activity too long');
  return list;
}

export function upsertReport(db, childId, date, columns, userId) {
  const names = Object.keys(columns);
  if (!names.length) return;
  db.prepare('INSERT OR IGNORE INTO daily_reports (child_id, date) VALUES (?, ?)').run(childId, date);
  const sets = names.map((n) => `${n} = ?`).join(', ');
  db.prepare(
    `UPDATE daily_reports SET ${sets}, updated_at = ?, updated_by = ? WHERE child_id = ? AND date = ?`,
  ).run(...names.map((n) => columns[n]), Date.now(), userId, childId, date);
}

/** API representation of a daily_reports row (or an empty report). */
export function serializeReport(row) {
  const r = row || {};
  const report = {
    absent: Boolean(r.absent),
    food_breakfast: r.food_breakfast ?? null,
    food_lunch: r.food_lunch ?? null,
    food_snack: r.food_snack ?? null,
    sleep_quality: r.sleep_quality ?? null,
    sleep_minutes: r.sleep_minutes ?? null,
    poop: r.poop ?? null,
    mood: r.mood ?? null,
    highlight: r.highlight ?? null,
    note: r.note ?? null,
    activities: r.activities ? JSON.parse(r.activities) : null,
    updatedAt: r.updated_at ?? null,
  };
  report.complete = isComplete(report);
  return report;
}

/** "עודכן" = the parent already knows how the day went and how the child ate. */
export function isComplete(report) {
  return !report.absent && Boolean(report.mood && (report.food_breakfast || report.food_lunch || report.food_snack));
}

export function serializeSupply(row) {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    items: JSON.parse(row.items),
    otherText: row.other_text,
    status: row.status,
    resolvedAt: row.resolved_at,
  };
}

export function serializeParentUpdate(row) {
  return {
    id: row.id,
    childId: row.child_id,
    date: row.date,
    types: JSON.parse(row.types),
    note: row.note,
    createdAt: row.created_at,
    seen: Boolean(row.seen_at),
  };
}

export function serializeClassDay(row) {
  return { activities: row ? JSON.parse(row.activities) : [] };
}

export function serializeMenu(row) {
  return { breakfast: row?.breakfast ?? null, lunch: row?.lunch ?? null, snack: row?.snack ?? null };
}
