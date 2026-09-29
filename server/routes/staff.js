import { Router } from 'express';
import { tx } from '../db.js';
import { requireRole } from '../auth.js';
import { staffChild, staffClass } from '../access.js';
import {
  HttpError,
  REPORT_FIELDS,
  bad,
  cleanText,
  fieldToColumns,
  parseId,
  parseSupplyItems,
  serializeClassDay,
  serializeParentUpdate,
  serializeReport,
  serializeSupply,
  todayIL,
  upsertReport,
} from '../domain.js';

const ACTIVITY_LIMIT = 12;

export function staffRoutes(db) {
  const r = Router();
  r.use(requireRole('staff'));

  function classPayload(cls, date) {
    const children = db
      .prepare('SELECT id, name, gender FROM children WHERE class_id = ? ORDER BY name')
      .all(cls.id);
    const ids = children.map((c) => c.id);
    const inList = ids.map(() => '?').join(',') || 'NULL';

    const reports = new Map(
      db
        .prepare(`SELECT * FROM daily_reports WHERE date = ? AND child_id IN (${inList})`)
        .all(date, ...ids)
        .map((row) => [row.child_id, row]),
    );
    const supplies = db
      .prepare(
        `SELECT * FROM supply_requests
         WHERE child_id IN (${inList}) AND (status = 'open' OR date = ?)
         ORDER BY date DESC`,
      )
      .all(...ids, date);
    const updates = db
      .prepare(`SELECT * FROM parent_updates WHERE date = ? AND child_id IN (${inList}) ORDER BY created_at`)
      .all(date, ...ids);

    return {
      date,
      class: { id: cls.id, name: cls.name },
      day: serializeClassDay(db.prepare('SELECT * FROM class_days WHERE class_id = ? AND date = ?').get(cls.id, date)),
      children: children.map((c) => ({
        ...c,
        report: serializeReport(reports.get(c.id)),
        supplies: supplies.filter((s) => s.child_id === c.id).map(serializeSupply),
        parentUpdates: updates.filter((u) => u.child_id === c.id).map(serializeParentUpdate),
      })),
    };
  }

  // Today's class. Staff with several classes get the first one unless ?classId= is given.
  r.get('/today', (req, res) => {
    const classes = db
      .prepare(
        `SELECT cl.id, cl.name FROM classes cl JOIN staff_classes sc ON sc.class_id = cl.id
         WHERE sc.user_id = ? ORDER BY cl.sort`,
      )
      .all(req.user.id);
    if (!classes.length) return res.json({ classes: [], class: null });
    const classId = req.query.classId ? parseId(req.query.classId) : classes[0].id;
    const cls = staffClass(db, req.user, classId);
    res.json({ classes, ...classPayload(cls, todayIL()) });
  });

  // Batch update: one field, many children. Also used for undo (entries carry previous values).
  r.post('/classes/:classId/reports', (req, res) => {
    const cls = staffClass(db, req.user, parseId(req.params.classId));
    const { field, entries } = req.body ?? {};
    if (!REPORT_FIELDS.includes(field) || !Array.isArray(entries) || !entries.length || entries.length > 100) {
      throw bad();
    }
    const date = todayIL();
    const inClass = new Set(
      db.prepare('SELECT id FROM children WHERE class_id = ?').all(cls.id).map((c) => c.id),
    );
    const parsed = entries.map((e) => {
      const childId = parseId(e?.childId);
      if (!inClass.has(childId)) throw bad('child not in class');
      return { childId, columns: fieldToColumns(field, e.value) };
    });
    tx(db, () => parsed.forEach((p) => upsertReport(db, p.childId, date, p.columns, req.user.id)));
    res.json(classPayload(cls, date));
  });

  // Several fields for a single child.
  r.patch('/children/:childId/report', (req, res) => {
    const child = staffChild(db, req.user, parseId(req.params.childId));
    const body = req.body ?? {};
    const keys = Object.keys(body);
    if (!keys.length || keys.some((k) => !REPORT_FIELDS.includes(k))) throw bad();
    const columns = Object.assign({}, ...keys.map((k) => fieldToColumns(k, body[k])));
    const date = todayIL();
    upsertReport(db, child.id, date, columns, req.user.id);
    res.json({
      report: serializeReport(
        db.prepare('SELECT * FROM daily_reports WHERE child_id = ? AND date = ?').get(child.id, date),
      ),
    });
  });

  // Today's "חסר בתיק" for one child. Changing the list reopens a request the parent already handled.
  r.put('/children/:childId/supplies', (req, res) => {
    const child = staffChild(db, req.user, parseId(req.params.childId));
    const items = parseSupplyItems(req.body?.items);
    const otherText = items.includes('other') ? cleanText(req.body?.otherText) : null;
    const date = todayIL();
    if (!items.length) {
      db.prepare('DELETE FROM supply_requests WHERE child_id = ? AND date = ?').run(child.id, date);
    } else {
      db.prepare(
        `INSERT INTO supply_requests (child_id, date, items, other_text, status, created_at)
         VALUES (?, ?, ?, ?, 'open', ?)
         ON CONFLICT (child_id, date) DO UPDATE SET
           items = excluded.items, other_text = excluded.other_text, status = 'open', resolved_at = NULL`,
      ).run(child.id, date, JSON.stringify(items), otherText, Date.now());
    }
    const supplies = db
      .prepare(`SELECT * FROM supply_requests WHERE child_id = ? AND (status = 'open' OR date = ?) ORDER BY date DESC`)
      .all(child.id, date);
    res.json({ supplies: supplies.map(serializeSupply) });
  });

  // Class-level info, entered once for everyone.
  r.put('/classes/:classId/day', (req, res) => {
    const cls = staffClass(db, req.user, parseId(req.params.classId));
    const { menuBreakfast, menuLunch, activities } = req.body ?? {};
    if (!Array.isArray(activities) || activities.length > ACTIVITY_LIMIT) throw bad();
    const cleanActivities = [...new Set(activities.map(cleanText).filter(Boolean))];
    if (cleanActivities.some((a) => a.length > 40)) throw bad('activity too long');
    const date = todayIL();
    db.prepare(
      `INSERT INTO class_days (class_id, date, menu_breakfast, menu_lunch, activities, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (class_id, date) DO UPDATE SET
         menu_breakfast = excluded.menu_breakfast, menu_lunch = excluded.menu_lunch,
         activities = excluded.activities, updated_at = excluded.updated_at`,
    ).run(cls.id, date, cleanText(menuBreakfast), cleanText(menuLunch), JSON.stringify(cleanActivities), Date.now());
    res.json({ day: serializeClassDay(db.prepare('SELECT * FROM class_days WHERE class_id = ? AND date = ?').get(cls.id, date)) });
  });

  r.post('/parent-updates/:id/seen', (req, res) => {
    const update = db.prepare('SELECT * FROM parent_updates WHERE id = ?').get(parseId(req.params.id));
    if (!update) throw new HttpError(404, 'not found');
    staffChild(db, req.user, update.child_id);
    db.prepare('UPDATE parent_updates SET seen_at = COALESCE(seen_at, ?) WHERE id = ?').run(Date.now(), update.id);
    res.json({ ok: true });
  });

  return r;
}
