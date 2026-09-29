// Realistic Hebrew demo data. Run `npm run seed` to reset the database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, tx } from './db.js';
import { hashPassword } from './auth.js';
import { addDays, todayIL } from './domain.js';

export const DEMO_PASSWORD = 'gan12345';
export const DEMO_ACCOUNTS = {
  staff: { phone: '0500000002', name: 'מיכל' },
  parent: { phone: '0500000001', name: 'נוי' },
};

// The official תשפ״ז schedule. display_date / weekdays are only set where the wording differs
// from what the dates produce on their own.
const VACATIONS = [
  ['ראש השנה', 'holiday', '2026-09-11', '2026-09-13', '2026-09-14', { display_date: '11.09 + 13.09', weekdays: 'שישי וראשון' }],
  ['יום כיפור', 'holiday', '2026-09-20', '2026-09-21', '2026-09-22'],
  ['סוכות', 'holiday', '2026-09-25', '2026-09-25', '2026-09-27'],
  ['חול המועד סוכות ושמחת תורה', 'holiday', '2026-09-30', '2026-10-02', '2026-10-04'],
  ['חנוכה', 'holiday', '2026-12-09', '2026-12-11', '2026-12-13'],
  ['יום צוות', 'staff_day', '2027-01-29', '2027-01-29', '2027-01-31'],
  ['פורים', 'holiday', '2027-03-23', '2027-03-24', '2027-03-25'],
  ['פסח', 'holiday', '2027-04-19', '2027-04-28', '2027-04-29'],
  ['יום הזיכרון', 'short_day', '2027-05-11', '2027-05-11', null, { note: 'הגן פתוח עד 12:00' }],
  ['יום העצמאות', 'holiday', '2027-05-12', '2027-05-12', '2027-05-13'],
  ['שבועות', 'holiday', '2027-06-10', '2027-06-11', '2027-06-13', { weekdays: 'חמישי ושישי' }],
  ['יום צוות', 'staff_day', '2027-07-09', '2027-07-09', '2027-07-11'],
];

const CLASSES = [
  {
    name: 'תינוקייה',
    staff: [['שירן', '0500000010'], ['אורית', '0500000003']],
    children: [['אגם', 'f'], ['רון', 'm'], ['הדר', 'f'], ['יונתן', 'm'], ['אלה', 'f'], ['נדב', 'm'], ['רומי', 'f'], ['גיא', 'm']],
  },
  {
    name: 'צעירים',
    staff: [['מיכל', DEMO_ACCOUNTS.staff.phone], ['סיוון', '0500000011']],
    children: [
      ['ניב', 'f'], ['יואב', 'm'], ['מאיה', 'f'], ['איתי', 'm'], ['נועה', 'f'], ['אריאל', 'm'],
      ['תמר', 'f'], ['עומר', 'm'], ['ליה', 'f'], ['אלון', 'm'], ['שירה', 'f'], ['דניאל', 'm'],
    ],
  },
  {
    name: 'בוגרים',
    staff: [['רונית', '0500000012']],
    children: [
      ['אביגיל', 'f'], ['עידו', 'm'], ['יעל', 'f'], ['איתמר', 'm'], ['מיקה', 'f'], ['אורי', 'm'], ['עלמה', 'f'],
      ['בן', 'm'], ['נגה', 'f'], ['אדם', 'm'], ['הילה', 'f'], ['רועי', 'm'], ['טליה', 'f'], ['אליה', 'm'],
    ],
  },
];

const FULL = { food: 'all', sleep_status: 'slept', sleep_start: '12:30', sleep_end: '14:30', poop: 'no', mood: 'good' };

const NIV_HISTORY = [
  { food: 'all', sleep_start: '12:35', sleep_end: '14:20', poop: 'yes', mood: 'great', highlight: 'ניב בנתה מגדל קוביות גבוה ומחאה לעצמה כפיים', activities: ['יצירה', 'חצר'] },
  { food: 'little', sleep_start: '12:50', sleep_end: '13:55', poop: 'no', mood: 'hard', note: 'ניב הייתה קצת עייפה היום וביקשה הרבה חיבוקים', activities: ['סיפור'] },
  { food: 'most', sleep_start: '12:30', sleep_end: '14:30', poop: 'yes', mood: 'good', highlight: 'שרה עם כולם את "בוקר טוב" במעגל', activities: ['חוג מוזיקה'] },
  { food: 'all', sleep_start: '12:40', sleep_end: '14:10', poop: 'yes', mood: 'great', highlight: 'ניב האכילה את הבובה שלה בכפית, בדיוק כמו שהיא לומדת', activities: ['משחקי מים'] },
  { food: 'most', sleep_start: '12:30', sleep_end: '14:00', poop: 'no', mood: 'good', activities: ['פעילות תנועה'] },
];

/** Previous kindergarten days (Sunday–Thursday), most recent first. */
function previousGanDays(today, count) {
  const days = [];
  let d = today;
  while (days.length < count) {
    d = addDays(d, -1);
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (dow <= 4) days.push(d);
  }
  return days;
}

export function seed(db, today = todayIL()) {
  const pw = hashPassword(DEMO_PASSWORD);
  const now = Date.now();

  tx(db, () => {
    const kgId = db
      .prepare('INSERT INTO kindergartens (name, hours, phone, notice, school_year, summer_start) VALUES (?, ?, ?, ?, ?, ?)')
      .run('גן השקמה', 'א׳–ה׳ 07:30–16:00 · ו׳ 07:30–12:30', '03-1234567',
        'תזכורת: בגדים להחלפה בתיק כל יום, מסומנים בשם הילד/ה', 'תשפ״ז', '2027-08-06').lastInsertRowid;
    for (const [name, type, start, end, ret, extra = {}] of VACATIONS) {
      db.prepare(
        `INSERT INTO vacations (kindergarten_id, name, type, start_date, end_date, return_date, note, display_date, weekdays)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(kgId, name, type, start, end, ret, extra.note ?? null, extra.display_date ?? null, extra.weekdays ?? null);
    }
    const addUser = db.prepare('INSERT INTO users (kindergarten_id, role, name, phone, password_hash) VALUES (?, ?, ?, ?, ?)');
    const user = (role, name, phone) => Number(addUser.run(kgId, role, name, phone, pw).lastInsertRowid);

    const kids = {};
    const classIds = {};
    CLASSES.forEach((cls, i) => {
      const classId = Number(db.prepare('INSERT INTO classes (kindergarten_id, name, sort) VALUES (?, ?, ?)').run(kgId, cls.name, i).lastInsertRowid);
      classIds[cls.name] = classId;
      // Staff (teachers and the owner alike) see the whole kindergarten; the class only groups the demo list.
      for (const [name, phone] of cls.staff) user('staff', name, phone);
      for (const [name, gender] of cls.children) {
        kids[name] = Number(db.prepare('INSERT INTO children (class_id, name, gender) VALUES (?, ?, ?)').run(classId, name, gender).lastInsertRowid);
      }
    });

    const link = (parentId, child) => db.prepare('INSERT INTO parent_children (parent_id, child_id) VALUES (?, ?)').run(parentId, kids[child]);
    const noy = user('parent', DEMO_ACCOUNTS.parent.name, DEMO_ACCOUNTS.parent.phone);
    link(noy, 'ניב');
    link(noy, 'אלה'); // Niv's little sister, so the demo shows the child switcher
    const dana = user('parent', 'דנה', '0500000004');
    link(dana, 'יואב');
    const shani = user('parent', 'שני', '0500000005');
    link(shani, 'מאיה');

    const report = (child, date, fields) => {
      const cols = Object.keys(fields);
      db.prepare(
        `INSERT INTO daily_reports (child_id, date, ${cols.join(', ')}, updated_at)
         VALUES (?, ?, ${cols.map(() => '?').join(', ')}, ?)`,
      ).run(kids[child], date, ...cols.map((c) => fields[c]), now);
    };
    const classDay = (cls, date, breakfast, lunch, activities) =>
      db.prepare('INSERT INTO class_days (class_id, date, menu_breakfast, menu_lunch, activities, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(classIds[cls], date, breakfast, lunch, JSON.stringify(activities), now);
    const supply = (child, date, items, status = 'open') =>
      db.prepare('INSERT INTO supply_requests (child_id, date, items, status, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(kids[child], date, JSON.stringify(items), status, now);
    const parentUpdate = (author, child, types, note, seen = false) =>
      db.prepare('INSERT INTO parent_updates (child_id, date, author_id, types, note, created_at, seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(kids[child], today, author, JSON.stringify(types), note, now, seen ? now : null);

    // --- Today, צעירים: Niv's day is done, a few others too, the rest waits for the teacher.
    classDay('צעירים', today, 'כריך גבינה וירקות', 'קציצות, אורז וירקות', ['חוג מוזיקה']);
    report('ניב', today, {
      food: 'most', sleep_status: 'slept', sleep_start: '12:40', sleep_end: '14:15', poop: 'yes', mood: 'good',
      highlight: 'ניב ניסתה היום לאכול לבד עם כפית',
    });
    report('מאיה', today, { ...FULL, mood: 'great' });
    report('איתי', today, { ...FULL, food: 'most', poop: 'yes' });
    report('נועה', today, { food: 'all' });
    report('דניאל', today, { absent: 1 });
    supply('ניב', today, ['wipes']);
    parentUpdate(dana, 'יואב', ['early_pickup'], 'אבא יגיע ב-13:30');
    parentUpdate(shani, 'מאיה', ['other_pickup'], 'סבתא רותי תאסוף היום', true);

    // --- Other classes, so the class overview has something real to show.
    classDay('תינוקייה', today, 'דייסת סולת', 'פתיתים עם עוף וירקות מבושלים', ['משחקי חושים']);
    ['אגם', 'רון', 'הדר', 'יונתן', 'אלה', 'נדב'].forEach((c) => report(c, today, FULL));
    report('רומי', today, { food: 'most', mood: 'good' });
    report('גיא', today, { absent: 1 });
    supply('אגם', addDays(today, -1), ['diapers']);

    classDay('בוגרים', today, 'לחם מלא, חומוס וירקות', 'שניצל, פירה וסלט', ['יצירה', 'פעילות תנועה']);
    CLASSES[2].children.slice(0, 11).forEach(([c]) => report(c, today, { ...FULL, sleep_start: '13:00', sleep_end: '14:30' }));
    db.prepare('UPDATE daily_reports SET note = ? WHERE child_id = ? AND date = ?')
      .run('עידו קיבל מכה קלה בברך בחצר. טיפלנו, והכל בסדר', kids['עידו'], today);
    supply('עלמה', today, ['clothes']);

    // --- Niv's recent days, for the "הילדה שלי" tab.
    previousGanDays(today, NIV_HISTORY.length).forEach((date, i) => {
      const { activities, ...h } = NIV_HISTORY[i];
      report('ניב', date, { food: h.food, sleep_status: 'slept', sleep_start: h.sleep_start, sleep_end: h.sleep_end, poop: h.poop, mood: h.mood, highlight: h.highlight ?? null, note: h.note ?? null });
      classDay('צעירים', date, 'לחם, ממרח וירקות', 'אורז, עוף וירקות', activities);
    });
    supply('ניב', previousGanDays(today, 2)[1], ['clothes'], 'done');
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.env.DB_PATH || path.resolve('data/gan.db');
  if (process.argv.includes('--reset')) {
    for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
  }
  const db = openDb(file);
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n) {
    console.log('Database already has data. Use --reset to recreate it.');
  } else {
    seed(db);
    console.log(`Seeded ${file}`);
  }
}
