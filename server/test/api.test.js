import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db.js';
import { createApp } from '../app.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seed } from '../seed.js';

let server;
let base;
let db;

before(async () => {
  db = openDb(':memory:');
  seed(db);
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

async function login(phone, password = DEMO_PASSWORD) {
  const res = await call(null, 'POST', '/auth/login', { phone, password });
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

const childId = (name) => db.prepare('SELECT id FROM children WHERE name = ?').get(name).id;
const classId = (name) => db.prepare('SELECT id FROM classes WHERE name = ?').get(name).id;

describe('authentication', () => {
  test('rejects wrong password and unknown phone the same way', async () => {
    const a = await call(null, 'POST', '/auth/login', { phone: DEMO_ACCOUNTS.parent.phone, password: 'nope' });
    const b = await call(null, 'POST', '/auth/login', { phone: '0599999999', password: 'nope' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.deepEqual(await a.json(), await b.json());
  });

  test('accepts phone in +972 format and sets an HttpOnly cookie', async () => {
    const res = await call(null, 'POST', '/auth/login', { phone: '+972-50-000-0001', password: DEMO_PASSWORD });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  });

  test('requires the CSRF header on mutations', async () => {
    const res = await call(null, 'POST', '/auth/login', { phone: DEMO_ACCOUNTS.parent.phone, password: DEMO_PASSWORD }, {});
    assert.equal(res.status, 403);
  });

  test('logout invalidates the session', async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.phone);
    await call(cookie, 'POST', '/auth/logout');
    assert.equal((await call(cookie, 'GET', '/me')).status, 401);
  });
});

describe('parent permissions', () => {
  test('sees only own children', async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.phone);
    const { children } = await (await call(cookie, 'GET', '/parent/children')).json();
    assert.deepEqual(children.map((c) => c.name), ['ניב']);
  });

  test("cannot read another family's child", async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.phone);
    assert.equal((await call(cookie, 'GET', `/parent/children/${childId('יואב')}/day`)).status, 404);
    assert.equal((await call(cookie, 'GET', `/parent/children/${childId('יואב')}/history`)).status, 404);
    assert.equal((await call(cookie, 'POST', `/parent/children/${childId('יואב')}/updates`, { types: ['cold'] })).status, 404);
  });

  test("cannot resolve another child's supply request", async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.phone);
    const other = db.prepare('SELECT id FROM supply_requests WHERE child_id = ?').get(childId('אגם'));
    assert.equal((await call(cookie, 'POST', `/parent/supplies/${other.id}/done`)).status, 404);
  });

  test('cannot use staff or manager endpoints', async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.phone);
    assert.equal((await call(cookie, 'GET', '/staff/today')).status, 403);
    assert.equal((await call(cookie, 'GET', '/manager/overview')).status, 403);
  });

  test('sees the day, marks supplies handled, sends an update', async () => {
    const cookie = await login(DEMO_ACCOUNTS.parent.phone);
    const niv = childId('ניב');
    const day = await (await call(cookie, 'GET', `/parent/children/${niv}/day`)).json();
    assert.equal(day.report.mood, 'good');
    assert.equal(day.report.sleep.minutes, 95);
    assert.deepEqual(day.day.activities, ['חוג מוזיקה']);
    const open = day.supplies.find((s) => s.status === 'open');
    const done = await (await call(cookie, 'POST', `/parent/supplies/${open.id}/done`)).json();
    assert.equal(done.supply.status, 'done');

    const sent = await call(cookie, 'POST', `/parent/children/${niv}/updates`, { types: ['bad_night'], note: 'התעוררה פעמיים' });
    assert.equal(sent.status, 201);
    assert.equal((await call(cookie, 'POST', `/parent/children/${niv}/updates`, { types: ['bogus'] })).status, 400);
  });
});

describe('staff permissions', () => {
  test('sees only assigned class', async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.phone);
    const today = await (await call(cookie, 'GET', '/staff/today')).json();
    assert.equal(today.class.name, 'צעירים');
    assert.deepEqual(today.classes.map((c) => c.name), ['צעירים']);
    assert.equal((await call(cookie, 'GET', `/staff/today?classId=${classId('בוגרים')}`)).status, 404);
  });

  test('batch update applies to the class, rejects children from other classes', async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.phone);
    const res = await call(cookie, 'POST', `/staff/classes/${classId('צעירים')}/reports`, {
      field: 'food',
      entries: [{ childId: childId('יואב'), value: 'all' }, { childId: childId('תמר'), value: 'all' }],
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.children.find((c) => c.name === 'תמר').report.food, 'all');

    const cross = await call(cookie, 'POST', `/staff/classes/${classId('צעירים')}/reports`, {
      field: 'food',
      entries: [{ childId: childId('עידו'), value: 'none' }],
    });
    assert.equal(cross.status, 400);
  });

  test('validates sleep times', async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.phone);
    const url = `/staff/children/${childId('יואב')}/report`;
    assert.equal((await call(cookie, 'PATCH', url, { sleep: { status: 'slept', start: '14:00', end: '13:00' } })).status, 400);
    const ok = await (await call(cookie, 'PATCH', url, { sleep: { status: 'slept', start: '12:30', end: '14:05' } })).json();
    assert.equal(ok.report.sleep.minutes, 95);
  });

  test("cannot edit a child in another class", async () => {
    const cookie = await login(DEMO_ACCOUNTS.staff.phone);
    assert.equal((await call(cookie, 'PATCH', `/staff/children/${childId('עידו')}/report`, { mood: 'hard' })).status, 404);
    assert.equal((await call(cookie, 'PUT', `/staff/children/${childId('עידו')}/supplies`, { items: ['wipes'] })).status, 404);
  });

  test('class day info reaches the parent', async () => {
    const staff = await login(DEMO_ACCOUNTS.staff.phone);
    await call(staff, 'PUT', `/staff/classes/${classId('צעירים')}/day`, {
      menuBreakfast: 'חביתה',
      menuLunch: 'פסטה',
      activities: ['יצירה', 'יצירה', 'חצר'],
    });
    const parent = await login(DEMO_ACCOUNTS.parent.phone);
    const day = await (await call(parent, 'GET', `/parent/children/${childId('ניב')}/day`)).json();
    assert.equal(day.day.menuLunch, 'פסטה');
    assert.deepEqual(day.day.activities, ['יצירה', 'חצר']);
  });
});

describe('manager', () => {
  test('sees own kindergarten overview but cannot write reports', async () => {
    const cookie = await login(DEMO_ACCOUNTS.manager.phone);
    const overview = await (await call(cookie, 'GET', '/manager/overview')).json();
    assert.deepEqual(overview.classes.map((c) => c.name), ['תינוקייה', 'צעירים', 'בוגרים']);
    assert.ok(overview.totals.present > 0);
    assert.equal((await call(cookie, 'PATCH', `/staff/children/${childId('ניב')}/report`, { mood: 'hard' })).status, 403);
  });
});
