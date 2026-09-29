import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db.js';
import { createApp } from '../app.js';
import { hashPassword } from '../auth.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seed } from '../seed.js';

let server;
let base;
let db;
const OTHER = { staff: 'other-staff', parent: 'other-parent' };

before(async () => {
  db = openDb(':memory:');
  seed(db);
  addSecondKindergarten();
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

// A second kindergarten, to prove nothing leaks across kindergartens.
function addSecondKindergarten() {
  const pw = hashPassword(DEMO_PASSWORD);
  const kg = db.prepare(`INSERT INTO kindergartens (name, notice, school_year) VALUES ('גן אחר', 'סוד', 'תשפ״ז')`).run().lastInsertRowid;
  const cls = db.prepare(`INSERT INTO classes (kindergarten_id, name) VALUES (?, 'כיתה אחרת')`).run(kg).lastInsertRowid;
  db.prepare(`INSERT INTO children (class_id, name, gender) VALUES (?, 'זר', 'm')`).run(cls);
  db.prepare(`INSERT INTO vacations (kindergarten_id, name, type, start_date, end_date, return_date)
              VALUES (?, 'חופשה אחרת', 'holiday', '2026-11-01', '2026-11-01', '2026-11-02')`).run(kg);
  const addUser = db.prepare('INSERT INTO users (kindergarten_id, role, name, username, password_hash) VALUES (?, ?, ?, ?, ?)');
  addUser.run(kg, 'staff', 'צוות אחר', OTHER.staff, pw);
  const parent = addUser.run(kg, 'parent', 'הורה אחר', OTHER.parent, pw).lastInsertRowid;
  db.prepare('INSERT INTO parent_children (parent_id, child_id) VALUES (?, ?)').run(parent, childId('זר'));
}

async function login(username, password = DEMO_PASSWORD) {
  const res = await call(null, 'POST', '/auth/login', { username, password });
  assert.equal(res.status, 200);
  return res.headers.get('set-cookie').split(';')[0];
}

async function call(cookie, method, url, body, headers = { 'x-requested-with': 'gan' }) {
  return fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function childId(name) {
  return db.prepare('SELECT id FROM children WHERE name = ?').get(name).id;
}
function classId(name) {
  return db.prepare('SELECT id FROM classes WHERE name = ?').get(name).id;
}

describe('authentication', () => {
  test('rejects wrong password and unknown username the same way', async () => {
    const a = await call(null, 'POST', '/auth/login', { username: DEMO_ACCOUNTS.parent.username, password: 'nope' });
    const b = await call(null, 'POST', '/auth/login', { username: 'nobody', password: 'nope' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.deepEqual(await a.json(), await b.json());
  });

  test('usernames ignore case and spaces; session cookie is HttpOnly', async () => {
    const res = await call(null, 'POST', '/auth/login', { username: ' Noy ', password: DEMO_PASSWORD });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  });

  test('requires the CSRF header on mutations', async () => {
    const res = await call(null, 'POST', '/auth/login', { username: DEMO_ACCOUNTS.parent.username, password: DEMO_PASSWORD }, {});
    assert.equal(res.status, 403);
  });

  test('each entrance only opens its own role', async () => {
    const asStaff = await call(null, 'POST', '/auth/login', { username: DEMO_ACCOUNTS.parent.username, password: DEMO_PASSWORD, role: 'staff' });
    assert.equal(asStaff.status, 401);
    const asParent = await call(null, 'POST', '/auth/login', { username: DEMO_ACCOUNTS.parent.username, password: DEMO_PASSWORD, role: 'parent' });
    assert.equal(asParent.status, 200);
  });

  test('a session works on any instance with the same secret; forged tokens do not', async () => {
    // Vercel runs several function instances, each with its own database.
    const other = openDb(':memory:');
    seed(other);
    const server2 = createApp(other).listen(0);
    await new Promise((r) => server2.once('listening', r));
    const base2 = `http://127.0.0.1:${server2.address().port}/api`;
    try {
      const cookie = await login(DEMO_ACCOUNTS.staff.username);
      const me = await fetch(`${base2}/staff/today`, { headers: { cookie } });
      assert.equal(me.status, 200);
      const [name, value] = cookie.split('=');
      const parts = value.split('.');
      const forged = `${name}=${[String(Number(parts[0]) + 1), ...parts.slice(1)].join('.')}`;
      assert.equal((await fetch(`${base2}/me`, { headers: { cookie: forged } })).status, 401);
    } finally {
      server2.close();
    }
  });

  test('logout invalidates the session', async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.username);
    await call(cookie, 'POST', '/auth/logout');
    assert.equal((await call(cookie, 'GET', '/me')).status, 401);
  });
});

describe('parent permissions', () => {
  test('sees only own children', async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.username);
    const { children } = await (await call(cookie, 'GET', '/parent/children')).json();
    assert.deepEqual(children.map((c) => c.name), ['ניב', 'אלה']);
  });

  test("cannot read another family's child", async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.username);
    assert.equal((await call(cookie, 'GET', `/parent/children/${childId('יואב')}/day`)).status, 404);
    assert.equal((await call(cookie, 'GET', `/parent/children/${childId('יואב')}/history`)).status, 404);
    assert.equal((await call(cookie, 'POST', `/parent/children/${childId('יואב')}/updates`, { types: ['cold'] })).status, 404);
  });

  test("cannot resolve another child's supply request", async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.username);
    const other = db.prepare('SELECT id FROM supply_requests WHERE child_id = ?').get(childId('אגם'));
    assert.equal((await call(cookie, 'POST', `/parent/supplies/${other.id}/done`)).status, 404);
  });

  test('cannot use staff endpoints, even by editing the request', async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.username);
    assert.equal((await call(cookie, 'GET', '/staff/today')).status, 403);
    assert.equal((await call(cookie, 'PATCH', `/staff/children/${childId('ניב')}/report`, { mood: 'great' })).status, 403);
    assert.equal((await call(cookie, 'POST', '/staff/vacations', {})).status, 403);
    assert.equal((await call(cookie, 'PUT', '/staff/kindergarten', {})).status, 403);
  });

  test("parent of another kindergarten sees only that kindergarten's info", async () => {
    const cookie = await login(OTHER.parent);
    const { items } = await (await call(cookie, 'GET', '/vacations')).json();
    assert.deepEqual(items.map((v) => v.name), ['חופשה אחרת']);
    assert.equal((await call(cookie, 'GET', `/parent/children/${childId('ניב')}/day`)).status, 404);
  });

  test('sees the day, marks supplies handled, sends an update', async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.username);
    const niv = childId('ניב');
    const day = await (await call(cookie, 'GET', `/parent/children/${niv}/day`)).json();
    assert.equal(day.report.mood, 'good');
    assert.equal(day.report.sleep.minutes, 95);
    assert.deepEqual(day.day.activities, ['חוג מוזיקה', 'יצירה', 'חצר']);
    assert.equal(day.report.activities, null); // null = joined all of today's activities
    assert.equal(day.menu.lunch, 'קציצות, אורז וירקות');
    const open = day.supplies.find((s) => s.status === 'open');
    const done = await (await call(cookie, 'POST', `/parent/supplies/${open.id}/done`)).json();
    assert.equal(done.supply.status, 'done');

    const sent = await call(cookie, 'POST', `/parent/children/${niv}/updates`, { types: ['bad_night'], note: 'התעוררה פעמיים' });
    assert.equal(sent.status, 201);
    assert.equal((await call(cookie, 'POST', `/parent/children/${niv}/updates`, { types: ['bogus'] })).status, 400);
  });
});

describe('staff permissions', () => {
  test('sees every class of the kindergarten, and nothing of another kindergarten', async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.username);
    const today = await (await call(cookie, 'GET', '/staff/today')).json();
    assert.deepEqual(today.classes.map((c) => c.name), ['תינוקייה', 'צעירים', 'בוגרים']);
    const other = await (await call(cookie, 'GET', `/staff/today?classId=${classId('בוגרים')}`)).json();
    assert.equal(other.children.length, 14);

    const foreign = db.prepare(`SELECT id FROM classes WHERE name = 'כיתה אחרת'`).get().id;
    assert.equal((await call(cookie, 'GET', `/staff/today?classId=${foreign}`)).status, 404);
    assert.equal((await call(cookie, 'PATCH', `/staff/children/${childId('זר')}/report`, { mood: 'hard' })).status, 404);
    const foreignVacation = db.prepare(`SELECT id FROM vacations WHERE name = 'חופשה אחרת'`).get().id;
    assert.equal((await call(cookie, 'DELETE', `/staff/vacations/${foreignVacation}`)).status, 404);
  });

  test('batch update applies to one class, rejects children from other classes', async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.username);
    const res = await call(cookie, 'POST', `/staff/classes/${classId('צעירים')}/reports`, {
      field: 'food',
      entries: [{ childId: childId('יואב'), value: 'well' }, { childId: childId('תמר'), value: 'well' }],
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.children.find((c) => c.name === 'תמר').report.food, 'well');

    const cross = await call(cookie, 'POST', `/staff/classes/${classId('צעירים')}/reports`, {
      field: 'food',
      entries: [{ childId: childId('עידו'), value: 'little' }],
    });
    assert.equal(cross.status, 400);
  });

  test('validates sleep times', async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.username);
    const url = `/staff/children/${childId('יואב')}/report`;
    assert.equal((await call(cookie, 'PATCH', url, { sleep: { status: 'slept', start: '14:00', end: '13:00' } })).status, 400);
    const ok = await (await call(cookie, 'PATCH', url, { sleep: { status: 'slept', start: '12:30', end: '14:05' } })).json();
    assert.equal(ok.report.sleep.minutes, 95);
  });

  test("lists today's parent messages of their kindergarten only", async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.username);
    const { parentUpdates } = await (await call(cookie, 'GET', '/staff/parent-updates')).json();
    assert.ok(parentUpdates.length >= 2);
    assert.ok(parentUpdates.every((u) => u.childName !== 'זר'));
  });

  test('can update any child in the kindergarten', async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.username);
    assert.equal((await call(cookie, 'PATCH', `/staff/children/${childId('עידו')}/report`, { mood: 'great' })).status, 200);
  });

  test('general info reaches parents', async () => {
    const staff = await login(DEMO_ACCOUNTS.staff.username);
    await call(staff, 'PUT', '/staff/kindergarten', { hours: '07:30–16:00', phone: '03-1111111', notice: 'מחר יום פיג׳מות' });
    const parent = await login(DEMO_ACCOUNTS.parent.username);
    const { kindergarten } = await (await call(parent, 'GET', '/kindergarten')).json();
    assert.equal(kindergarten.notice, 'מחר יום פיג׳מות');
  });

  test('menu once for the kindergarten, activities once per class, selection per child', async () => {
    const staff = await login(DEMO_ACCOUNTS.staff.username);
    await call(staff, 'PUT', '/staff/menu', { breakfast: 'חביתה', lunch: 'פסטה', snack: null });
    await call(staff, 'PUT', `/staff/classes/${classId('צעירים')}/day`, { activities: ['יצירה', 'יצירה', 'חצר'] });
    const saved = await call(staff, 'PATCH', `/staff/children/${childId('ניב')}/report`, {
      mood: 'great', food: 'well', activities: ['חצר'], highlight: 'טיפסה לבד על המגלשה',
    });
    assert.equal(saved.status, 200);
    assert.equal((await call(staff, 'PATCH', `/staff/children/${childId('ניב')}/report`, { food: 'all' })).status, 400);

    const parent = await login(DEMO_ACCOUNTS.parent.username);
    const day = await (await call(parent, 'GET', `/parent/children/${childId('ניב')}/day`)).json();
    assert.equal(day.menu.lunch, 'פסטה');
    assert.deepEqual(day.day.activities, ['יצירה', 'חצר']);
    assert.deepEqual(day.report.activities, ['חצר']);
    assert.equal(day.report.food, 'well');

    // Another kindergarten's menu is never visible.
    const other = await login(OTHER.parent);
    const foreignDay = await (await call(other, 'GET', `/parent/children/${childId('זר')}/day`)).json();
    assert.equal(foreignDay.menu.lunch, null);
  });
});

describe('vacation calendar', () => {
  const EXPECTED = [
    ['ראש השנה', '11.09 + 13.09', 'שישי וראשון', 'יום שני', '14.09.2026'],
    ['יום כיפור', '20–21.09', 'ראשון–שני', 'יום שלישי', '22.09.2026'],
    ['סוכות', '25.09', 'שישי', 'יום ראשון', '27.09.2026'],
    ['חול המועד סוכות ושמחת תורה', '30.09–02.10', 'רביעי–שישי', 'יום ראשון', '04.10.2026'],
    ['חנוכה', '09–11.12', 'רביעי–שישי', 'יום ראשון', '13.12.2026'],
    ['יום צוות', '29.01', 'שישי', 'יום ראשון', '31.01.2027'],
    ['פורים', '23–24.03', 'שלישי–רביעי', 'יום חמישי', '25.03.2027'],
    ['פסח', '19–28.04', 'שני–רביעי', 'יום חמישי', '29.04.2027'],
    ['יום הזיכרון', '11.05', 'שלישי', null, null],
    ['יום העצמאות', '12.05', 'רביעי', 'יום חמישי', '13.05.2027'],
    ['שבועות', '10–11.06', 'חמישי ושישי', 'יום ראשון', '13.06.2027'],
    ['יום צוות', '09.07', 'שישי', 'יום ראשון', '11.07.2027'],
  ];

  test('parents get the exact official schedule', async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.username);
    const schedule = await (await call(cookie, 'GET', '/vacations')).json();
    assert.equal(schedule.title, 'לוח חופשות תשפ״ז');
    assert.deepEqual(schedule.items.map((v) => [v.name, v.displayDate, v.weekdays, v.returnDay, v.returnDate]), EXPECTED);
    assert.equal(schedule.items[8].note, 'הגן פתוח עד 12:00');
    assert.equal(schedule.summer.text, 'יוצאים לחופשת קיץ ביום שישי, 06.08.2027');
  });

  test('staff add, edit and delete vacations', async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.username);
    const bad = await call(cookie, 'POST', '/staff/vacations', {
      name: 'יום צוות', type: 'staff_day', startDate: '2027-02-05', endDate: '2027-02-05', returnDate: '2027-02-04',
    });
    assert.equal(bad.status, 400);

    const added = await (await call(cookie, 'POST', '/staff/vacations', {
      name: 'יום גיבוש', type: 'staff_day', startDate: '2027-02-05', endDate: '2027-02-05', returnDate: '2027-02-07',
    })).json();
    const item = added.items.find((v) => v.name === 'יום גיבוש');
    assert.deepEqual([item.displayDate, item.weekdays, item.returnDay], ['05.02', 'שישי', 'יום ראשון']);

    // Changing the dates drops custom wording that no longer fits.
    const rosh = added.items[0];
    const edited = await (await call(cookie, 'PUT', `/staff/vacations/${rosh.id}`, {
      name: rosh.name, type: 'holiday', startDate: '2026-09-11', endDate: '2026-09-14', returnDate: '2026-09-15',
    })).json();
    assert.deepEqual([edited.items[0].displayDate, edited.items[0].weekdays], ['11–14.09', 'שישי–שני']);

    const removed = await (await call(cookie, 'DELETE', `/staff/vacations/${item.id}`)).json();
    assert.ok(!removed.items.some((v) => v.name === 'יום גיבוש'));
  });
});
