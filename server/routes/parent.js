import { Router } from 'express';
import { requireRole } from '../auth.js';
import { parentChild } from '../access.js';
import {
  HttpError,
  addDays,
  bad,
  cleanText,
  parseDate,
  parseId,
  parseUpdateTypes,
  serializeClassDay,
  serializeMenu,
  serializeParentUpdate,
  serializeReport,
  serializeSupply,
  todayIL,
} from '../domain.js';

const HISTORY_DAYS = 14;

export function parentRoutes(db) {
  const r = Router();
  r.use(requireRole('parent'));

  r.get('/children', (req, res) => {
    const children = db
      .prepare(
        `SELECT c.id, c.name, c.gender, cl.name AS className, k.name AS kindergartenName
         FROM parent_children pc
         JOIN children c ON c.id = pc.child_id
         JOIN classes cl ON cl.id = c.class_id
         JOIN kindergartens k ON k.id = cl.kindergarten_id
         WHERE pc.parent_id = ? ORDER BY pc.rowid`,
      )
      .all(req.user.id);
    res.json({ children });
  });

  function dayPayload(child, date) {
    const row = db.prepare('SELECT * FROM daily_reports WHERE child_id = ? AND date = ?').get(child.id, date);
    return {
      date,
      isToday: date === todayIL(),
      hasReport: Boolean(row),
      report: serializeReport(row),
      day: serializeClassDay(
        db.prepare('SELECT * FROM class_days WHERE class_id = ? AND date = ?').get(child.class_id, date),
      ),
      menu: menuFor(child, date),
    };
  }

  // Parents reach the menu only through their own child's kindergarten.
  function menuFor(child, date) {
    return serializeMenu(
      db
        .prepare(
          `SELECT m.* FROM menus m JOIN classes cl ON cl.kindergarten_id = m.kindergarten_id
           WHERE cl.id = ? AND m.date = ?`,
        )
        .get(child.class_id, date),
    );
  }

  r.get('/children/:childId/day', (req, res) => {
    const child = parentChild(db, req.user, parseId(req.params.childId));
    const today = todayIL();
    const date = parseDate(req.query.date, today);
    if (date > today) throw bad('future date');
    const supplies = db
      .prepare(`SELECT * FROM supply_requests WHERE child_id = ? AND (status = 'open' OR date = ?) ORDER BY date`)
      .all(child.id, today);
    const updates = db
      .prepare('SELECT * FROM parent_updates WHERE child_id = ? AND date = ? ORDER BY created_at DESC')
      .all(child.id, today);
    res.json({
      ...dayPayload(child, date),
      supplies: supplies.map(serializeSupply),
      parentUpdates: updates.map(serializeParentUpdate),
    });
  });

  r.get('/children/:childId/history', (req, res) => {
    const child = parentChild(db, req.user, parseId(req.params.childId));
    const today = todayIL();
    const rows = db
      .prepare(
        `SELECT * FROM daily_reports WHERE child_id = ? AND date < ? AND date >= ?
         ORDER BY date DESC`,
      )
      .all(child.id, today, addDays(today, -HISTORY_DAYS));
    const days = rows.map((row) => ({
      date: row.date,
      report: serializeReport(row),
      day: serializeClassDay(
        db.prepare('SELECT * FROM class_days WHERE class_id = ? AND date = ?').get(child.class_id, row.date),
      ),
      menu: menuFor(child, row.date),
    }));
    res.json({ days });
  });

  // "עדכון לגן" — structured morning update, never a chat.
  r.post('/children/:childId/updates', (req, res) => {
    const child = parentChild(db, req.user, parseId(req.params.childId));
    const types = parseUpdateTypes(req.body?.types);
    const note = cleanText(req.body?.note);
    if (!types.length && !note) throw bad('empty update');
    const today = todayIL();
    const count = db
      .prepare('SELECT COUNT(*) AS n FROM parent_updates WHERE child_id = ? AND date = ?')
      .get(child.id, today).n;
    if (count >= 10) throw new HttpError(429, 'too many updates today');
    db.prepare(
      'INSERT INTO parent_updates (child_id, date, author_id, types, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(child.id, today, req.user.id, JSON.stringify(types), note, Date.now());
    const updates = db
      .prepare('SELECT * FROM parent_updates WHERE child_id = ? AND date = ? ORDER BY created_at DESC')
      .all(child.id, today);
    res.status(201).json({ parentUpdates: updates.map(serializeParentUpdate) });
  });

  // "טופל ✓"
  r.post('/supplies/:id/done', (req, res) => {
    const supply = db.prepare('SELECT * FROM supply_requests WHERE id = ?').get(parseId(req.params.id));
    if (!supply) throw new HttpError(404, 'not found');
    parentChild(db, req.user, supply.child_id);
    db.prepare(`UPDATE supply_requests SET status = 'done', resolved_at = ? WHERE id = ?`).run(Date.now(), supply.id);
    res.json({ supply: serializeSupply(db.prepare('SELECT * FROM supply_requests WHERE id = ?').get(supply.id)) });
  });

  return r;
}
