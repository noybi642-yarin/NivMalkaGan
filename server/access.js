// Authorization is enforced in the SQL itself: every lookup of a child, class or record joins
// through the requesting user's scope, so a row outside that scope is never read at all.
//
//   parent → only children linked to them in parent_children
//   staff  → only children/classes whose class belongs to the staff member's kindergarten
//
// Helpers return the row when it is in scope and throw 404 otherwise (404 rather than 403, so ids
// belonging to other families cannot be probed). Routes never trust ids from the client without
// passing them through one of these.
import { HttpError } from './domain.js';

const notFound = () => new HttpError(404, 'not found');

export function parentChild(db, user, childId) {
  const child = db
    .prepare(
      `SELECT c.* FROM children c
       JOIN parent_children pc ON pc.child_id = c.id
       WHERE c.id = ? AND pc.parent_id = ?`,
    )
    .get(childId, user.id);
  if (!child) throw notFound();
  return child;
}

export function staffClass(db, user, classId) {
  const cls = db
    .prepare('SELECT * FROM classes WHERE id = ? AND kindergarten_id = ?')
    .get(classId, user.kindergartenId);
  if (!cls) throw notFound();
  return cls;
}

export function staffChild(db, user, childId) {
  const child = db
    .prepare(
      `SELECT c.* FROM children c
       JOIN classes cl ON cl.id = c.class_id
       WHERE c.id = ? AND cl.kindergarten_id = ?`,
    )
    .get(childId, user.kindergartenId);
  if (!child) throw notFound();
  return child;
}

export function staffVacation(db, user, vacationId) {
  const row = db
    .prepare('SELECT * FROM vacations WHERE id = ? AND kindergarten_id = ?')
    .get(vacationId, user.kindergartenId);
  if (!row) throw notFound();
  return row;
}
