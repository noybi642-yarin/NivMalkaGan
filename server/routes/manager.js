import { Router } from 'express';
import { requireRole } from '../auth.js';
import { managerClass } from '../access.js';
import { parseId, serializeParentUpdate, serializeReport, serializeSupply, todayIL } from '../domain.js';

export function managerRoutes(db) {
  const r = Router();
  r.use(requireRole('manager'));

  function classStats(classId, date) {
    const children = db.prepare('SELECT id FROM children WHERE class_id = ?').all(classId);
    const reports = db
      .prepare(
        `SELECT dr.* FROM daily_reports dr JOIN children c ON c.id = dr.child_id
         WHERE c.class_id = ? AND dr.date = ?`,
      )
      .all(classId, date)
      .map(serializeReport);
    const absent = reports.filter((rep) => rep.absent).length;
    const present = children.length - absent;
    const complete = reports.filter((rep) => rep.complete).length;
    return { children: children.length, present, complete, pct: present ? Math.round((complete / present) * 100) : 100 };
  }

  r.get('/overview', (req, res) => {
    const date = todayIL();
    const kg = db.prepare('SELECT id, name FROM kindergartens WHERE id = ?').get(req.user.kindergartenId);
    const classes = db
      .prepare('SELECT id, name FROM classes WHERE kindergarten_id = ? ORDER BY sort')
      .all(kg.id)
      .map((c) => ({ ...c, ...classStats(c.id, date) }));

    const totals = classes.reduce(
      (t, c) => ({ children: t.children + c.children, present: t.present + c.present, complete: t.complete + c.complete }),
      { children: 0, present: 0, complete: 0 },
    );
    totals.openSupplies = db
      .prepare(
        `SELECT COUNT(*) AS n FROM supply_requests s
         JOIN children c ON c.id = s.child_id JOIN classes cl ON cl.id = c.class_id
         WHERE cl.kindergarten_id = ? AND s.status = 'open'`,
      )
      .get(kg.id).n;

    const childCols = 'c.name AS childName, c.gender, cl.name AS className';
    const parentUpdates = db
      .prepare(
        `SELECT pu.*, ${childCols} FROM parent_updates pu
         JOIN children c ON c.id = pu.child_id JOIN classes cl ON cl.id = c.class_id
         WHERE cl.kindergarten_id = ? AND pu.date = ? AND pu.seen_at IS NULL ORDER BY pu.created_at`,
      )
      .all(kg.id, date)
      .map((row) => ({
        kind: 'parent',
        ...serializeParentUpdate(row),
        childName: row.childName,
        gender: row.gender,
        className: row.className,
      }));
    const notes = db
      .prepare(
        `SELECT dr.child_id, dr.note, ${childCols} FROM daily_reports dr
         JOIN children c ON c.id = dr.child_id JOIN classes cl ON cl.id = c.class_id
         WHERE cl.kindergarten_id = ? AND dr.date = ? AND dr.note IS NOT NULL`,
      )
      .all(kg.id, date)
      .map((row) => ({
        kind: 'note',
        childId: row.child_id,
        note: row.note,
        childName: row.childName,
        gender: row.gender,
        className: row.className,
      }));

    res.json({ date, kindergarten: kg, totals, classes, attention: [...parentUpdates, ...notes] });
  });

  r.get('/classes/:classId', (req, res) => {
    const cls = managerClass(db, req.user, parseId(req.params.classId));
    const date = todayIL();
    const children = db.prepare('SELECT id, name, gender FROM children WHERE class_id = ? ORDER BY name').all(cls.id);
    const report = db.prepare('SELECT * FROM daily_reports WHERE child_id = ? AND date = ?');
    const supply = db.prepare(`SELECT * FROM supply_requests WHERE child_id = ? AND status = 'open' ORDER BY date DESC`);
    res.json({
      date,
      class: { id: cls.id, name: cls.name, ...classStats(cls.id, date) },
      children: children.map((c) => ({
        ...c,
        report: serializeReport(report.get(c.id, date)),
        supplies: supply.all(c.id).map(serializeSupply),
      })),
    });
  });

  r.get('/structure', (req, res) => {
    const kg = db.prepare('SELECT id, name FROM kindergartens WHERE id = ?').get(req.user.kindergartenId);
    const classes = db
      .prepare(
        `SELECT cl.id, cl.name, (SELECT COUNT(*) FROM children c WHERE c.class_id = cl.id) AS childCount
         FROM classes cl WHERE cl.kindergarten_id = ? ORDER BY cl.sort`,
      )
      .all(kg.id);
    const staff = db.prepare(
      `SELECT u.name FROM users u JOIN staff_classes sc ON sc.user_id = u.id WHERE sc.class_id = ? ORDER BY u.name`,
    );
    const parentCount = db
      .prepare(`SELECT COUNT(*) AS n FROM users WHERE kindergarten_id = ? AND role = 'parent'`)
      .get(kg.id).n;
    res.json({
      kindergarten: kg,
      parentCount,
      classes: classes.map((c) => ({ ...c, staff: staff.all(c.id).map((s) => s.name) })),
    });
  });

  return r;
}
