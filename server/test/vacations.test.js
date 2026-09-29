import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VACATION_SCHEDULE, vacationStatus } from '../../client/src/parent/vacations.js';

const weekday = (iso) =>
  new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
const fromDisplay = (ddmmyyyy) => ddmmyyyy.split('.').reverse().join('-');

test('schedule has every holiday and staff day', () => {
  assert.deepEqual(
    VACATION_SCHEDULE.items.map((v) => v.name),
    ['ראש השנה', 'יום כיפור', 'סוכות', 'חול המועד סוכות ושמחת תורה', 'חנוכה', 'יום צוות', 'פורים', 'פסח',
      'יום הזיכרון', 'יום העצמאות', 'שבועות', 'יום צוות'],
  );
  assert.equal(VACATION_SCHEDULE.summer.startDate, '2027-08-06');
  assert.equal(weekday('2027-08-06'), 'יום שישי');
});

test('dates and weekdays are consistent', () => {
  for (const v of VACATION_SCHEDULE.items) {
    assert.ok(v.startDate <= v.endDate, v.name);
    const [first] = v.weekdays.split(/[–\s]/);
    assert.equal(weekday(v.startDate), `יום ${first}`, `${v.name} start weekday`);
    if (v.type === 'short_day') {
      assert.equal(v.note, 'הגן פתוח עד 12:00');
      continue;
    }
    assert.equal(weekday(fromDisplay(v.returnDate)), v.returnDay, `${v.name} return weekday`);
    assert.ok(fromDisplay(v.returnDate) > v.endDate, `${v.name} returns after vacation`);
  }
});

test('status: soon, during, past', () => {
  const sukkot = VACATION_SCHEDULE.items[3];
  assert.equal(vacationStatus(sukkot, '2026-09-20'), null);
  assert.equal(vacationStatus(sukkot, '2026-09-29'), 'soon');
  assert.equal(vacationStatus(sukkot, '2026-10-01'), 'during');
  assert.equal(vacationStatus(sukkot, '2026-10-04'), 'past');
});
