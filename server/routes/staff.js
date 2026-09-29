import { Router } from 'express';
import { tx } from '../db.js';
import { requireRole } from '../auth.js';
import { staffChild, staffClass, staffVacation } from '../access.js';
import { kindergartenInfo, parseVacation, parseVacationSettings, vacationSchedule } from '../kindergarten.js';
import {
  HttpError,
  REPORT_FIELDS,
  bad,
  cleanText,
  fieldToColumns,
  parseId,
  parseSupplyItems,
  parseActivities,
  serializeClassDay,
  serializeMenu,
  serializeParentUpdate,
  serializeReport,
  serializeSupply,
  todayIL,
  upsertReport,
} from '../domain.js';

export function staffRoutes(db) {
  const r = Router();
  r.use(requireRole('staff'));

  // All classes of the kindergarten with today's completion — the owner's overview and the class switcher.
  function kindergartenClasses(user, date) {
    const classes = db
      .prepare('SELECT id, name FROM classes WHERE kindergarten_id = ? ORDER BY sort')
      .all(user.kindergartenId);
    const reports = db.prepare(
      `SELECT dr.* FROM daily_reports dr JOIN children c ON c.id = dr.child_id
       WHERE c.class_id = ? AND dr.date = ?`,
    );
    const count = db.prepare('SELECT COUNT(*) AS n FROM children WHERE class_id = ?');
    return classes.map((cl) => {
      const rows = reports.all(cl.id, date).map(serializeReport);
      const present = count.get(cl.id).n - rows.filter((r) => r.absent).length;
      const complete = rows.filter((r) => r.complete).length;
      return { ...cl, present, complete, pct: present ? Math.round((complete / present) * 100) : 100 };
    });
  }

  function classPayload(user, cls, date) {
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
      classes: kindergartenClasses(user, date),
      class: { id: cls.id, name: cls.name },
      day: serializeClassDay(db.prepare('SELECT * FROM class_days WHERE class_id = ? AND date = ?').get(cls.id, date)),
      menu: serializeMenu(db.prepare('SELECT * FROM menus WHERE kindergarten_id = ? AND date = ?').get(user.kindergartenId, date)),
      children: children.map((c) => ({
        ...c,
        report: serializeReport(reports.get(c.id)),
        supplies: supplies.filter((s) => s.child_id === c.id).map(serializeSupply),
        parentUpdates: updates.filter((u) => u.child_id === c.id).map(serializeParentUpdate),
      })),
    };
  }

  // Any class of the staff member's kindergarten; the first one unless ?classId= is given.
  r.get('/today', (req, res) => {
    const first = db
      .prepare('SELECT id FROM classes WHERE kindergarten_id = ? ORDER BY sort LIMIT 1')
      .get(req.user.kindergartenId);
    if (!first) return res.json({ classes: [], class: null });
    const cls = staffClass(db, req.user, req.query.classId ? parseId(req.query.classId) : first.id);
    res.json(classPayload(req.user, cls, todayIL()));
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
    res.json(classPayload(req.user, cls, date));
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

  // Today's activities, defined once per class; each child's report then selects from them.
  r.put('/classes/:classId/day', (req, res) => {
    const cls = staffClass(db, req.user, parseId(req.params.classId));
    const activities = parseActivities(req.body?.activities);
    const date = todayIL();
    db.prepare(
      `INSERT INTO class_days (class_id, date, activities, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (class_id, date) DO UPDATE SET activities = excluded.activities, updated_at = excluded.updated_at`,
    ).run(cls.id, date, JSON.stringify(activities), Date.now());
    res.json({ day: serializeClassDay(db.prepare('SELECT * FROM class_days WHERE class_id = ? AND date = ?').get(cls.id, date)) });
  });

  // Today's menu, entered once for the whole kindergarten.
  r.put('/menu', (req, res) => {
    const { breakfast, lunch, snack } = req.body ?? {};
    const date = todayIL();
    db.prepare(
      `INSERT INTO menus (kindergarten_id, date, breakfast, lunch, snack, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (kindergarten_id, date) DO UPDATE SET
         breakfast = excluded.breakfast, lunch = excluded.lunch, snack = excluded.snack, updated_at = excluded.updated_at`,
    ).run(req.user.kindergartenId, date, cleanText(breakfast), cleanText(lunch), cleanText(snack), Date.now());
    res.json({ menu: serializeMenu(db.prepare('SELECT * FROM menus WHERE kindergarten_id = ? AND date = ?').get(req.user.kindergartenId, date)) });
  });

  // Today's messages from parents, for the whole kindergarten.
  r.get('/parent-updates', (req, res) => {
    const rows = db
      .prepare(
        `SELECT pu.*, c.name AS childName, c.gender, cl.name AS className FROM parent_updates pu
         JOIN children c ON c.id = pu.child_id JOIN classes cl ON cl.id = c.class_id
         WHERE cl.kindergarten_id = ? AND pu.date = ? ORDER BY pu.seen_at IS NOT NULL, pu.created_at DESC`,
      )
      .all(req.user.kindergartenId, todayIL());
    res.json({
      parentUpdates: rows.map((row) => ({
        ...serializeParentUpdate(row),
        childName: row.childName,
        gender: row.gender,
        className: row.className,
      })),
    });
  });

  r.post('/parent-updates/:id/seen', (req, res) => {
    const update = db
      .prepare(
        `SELECT pu.id FROM parent_updates pu
         JOIN children c ON c.id = pu.child_id JOIN classes cl ON cl.id = c.class_id
         WHERE pu.id = ? AND cl.kindergarten_id = ?`,
      )
      .get(parseId(req.params.id), req.user.kindergartenId);
    if (!update) throw new HttpError(404, 'not found');
    db.prepare('UPDATE parent_updates SET seen_at = COALESCE(seen_at, ?) WHERE id = ?').run(Date.now(), update.id);
    res.json({ ok: true });
  });

  // General kindergarten information shown to parents.
  r.put('/kindergarten', (req, res) => {
    const { hours, phone, notice } = req.body ?? {};
    db.prepare('UPDATE kindergartens SET hours = ?, phone = ?, notice = ? WHERE id = ?').run(
      cleanText(hours),
      cleanText(phone),
      cleanText(notice),
      req.user.kindergartenId,
    );
    res.json({ kindergarten: kindergartenInfo(db, req.user.kindergartenId) });
  });

  // Vacation calendar.
  r.put('/vacations/settings', (req, res) => {
    const { schoolYear, summerStart } = parseVacationSettings(req.body);
    db.prepare('UPDATE kindergartens SET school_year = ?, summer_start = ? WHERE id = ?').run(
      schoolYear,
      summerStart,
      req.user.kindergartenId,
    );
    res.json(vacationSchedule(db, req.user.kindergartenId));
  });

  r.post('/vacations', (req, res) => {
    const v = parseVacation(req.body);
    db.prepare(
      `INSERT INTO vacations (kindergarten_id, name, type, start_date, end_date, return_date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(req.user.kindergartenId, v.name, v.type, v.startDate, v.endDate, v.returnDate, v.note);
    res.status(201).json(vacationSchedule(db, req.user.kindergartenId));
  });

  r.put('/vacations/:id', (req, res) => {
    const current = staffVacation(db, req.user, parseId(req.params.id));
    const v = parseVacation(req.body);
    // Custom wording (e.g. '11.09 + 13.09') only holds while the dates it describes are unchanged.
    const keepWording = v.startDate === current.start_date && v.endDate === current.end_date;
    db.prepare(
      `UPDATE vacations SET name = ?, type = ?, start_date = ?, end_date = ?, return_date = ?, note = ?,
         display_date = ?, weekdays = ?
       WHERE id = ? AND kindergarten_id = ?`,
    ).run(
      v.name, v.type, v.startDate, v.endDate, v.returnDate, v.note,
      keepWording ? current.display_date : null, keepWording ? current.weekdays : null,
      current.id, req.user.kindergartenId,
    );
    res.json(vacationSchedule(db, req.user.kindergartenId));
  });

  r.delete('/vacations/:id', (req, res) => {
    const current = staffVacation(db, req.user, parseId(req.params.id));
    db.prepare('DELETE FROM vacations WHERE id = ? AND kindergarten_id = ?').run(current.id, req.user.kindergartenId);
    res.json(vacationSchedule(db, req.user.kindergartenId));
  });

  return r;
}
