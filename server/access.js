// Every data-access decision goes through these helpers. They return the row when the user
// may access it and throw 404 otherwise (404 rather than 403, so ids of other families'
// children cannot be probed).
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
    .prepare(
      `SELECT cl.* FROM classes cl
       JOIN staff_classes sc ON sc.class_id = cl.id
       WHERE cl.id = ? AND sc.user_id = ?`,
    )
    .get(classId, user.id);
  if (!cls) throw notFound();
  return cls;
}

export function staffChild(db, user, childId) {
  const child = db
    .prepare(
      `SELECT c.* FROM children c
       JOIN staff_classes sc ON sc.class_id = c.class_id
       WHERE c.id = ? AND sc.user_id = ?`,
    )
    .get(childId, user.id);
  if (!child) throw notFound();
  return child;
}

export function managerClass(db, user, classId) {
  const cls = db
    .prepare('SELECT * FROM classes WHERE id = ? AND kindergarten_id = ?')
    .get(classId, user.kindergartenId);
  if (!cls) throw notFound();
  return cls;
}
