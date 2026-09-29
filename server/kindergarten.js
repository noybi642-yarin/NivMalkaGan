// Kindergarten-wide information: general info for parents and the vacation calendar.
// Every read and write is keyed by the caller's kindergarten id.
import { bad, cleanText, parseDate } from './domain.js';

const VACATION_TYPES = ['holiday', 'staff_day', 'short_day'];
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const weekday = (iso) => WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const dayMonth = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
const fullDate = (iso) => `${dayMonth(iso)}.${iso.slice(0, 4)}`;

/** '20–21.09', '30.09–02.10' or '25.09' */
function rangeLabel(start, end) {
  if (start === end) return dayMonth(start);
  if (start.slice(0, 7) === end.slice(0, 7)) return `${start.slice(8, 10)}–${dayMonth(end)}`;
  return `${dayMonth(start)}–${dayMonth(end)}`;
}

const weekdaysLabel = (start, end) => (start === end ? weekday(start) : `${weekday(start)}–${weekday(end)}`);

export function serializeVacation(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    displayDate: row.display_date || rangeLabel(row.start_date, row.end_date),
    weekdays: row.weekdays || weekdaysLabel(row.start_date, row.end_date),
    returnDateIso: row.return_date,
    returnDate: row.return_date ? fullDate(row.return_date) : null,
    returnDay: row.return_date ? `יום ${weekday(row.return_date)}` : null,
    note: row.note,
  };
}

export function vacationSchedule(db, kindergartenId) {
  const kg = db.prepare('SELECT school_year, summer_start FROM kindergartens WHERE id = ?').get(kindergartenId);
  const rows = db
    .prepare('SELECT * FROM vacations WHERE kindergarten_id = ? ORDER BY start_date, id')
    .all(kindergartenId);
  return {
    title: kg.school_year ? `לוח חופשות ${kg.school_year}` : 'לוח חופשות',
    subtitle: 'מועדי החופשות והחזרה לגן',
    schoolYear: kg.school_year,
    items: rows.map(serializeVacation),
    summer: kg.summer_start
      ? {
          startDate: kg.summer_start,
          text: `יוצאים לחופשת קיץ ביום ${weekday(kg.summer_start)}, ${fullDate(kg.summer_start)}`,
        }
      : null,
  };
}

export function kindergartenInfo(db, kindergartenId) {
  return db.prepare('SELECT name, hours, phone, notice FROM kindergartens WHERE id = ?').get(kindergartenId);
}

export function parseVacation(body = {}) {
  const name = cleanText(body.name);
  if (!name || name.length > 40) throw bad('invalid name');
  if (!VACATION_TYPES.includes(body.type)) throw bad('invalid type');
  const startDate = parseDate(body.startDate, null);
  const endDate = parseDate(body.endDate, startDate);
  if (!startDate || endDate < startDate) throw bad('invalid dates');

  if (body.type === 'short_day') {
    const note = cleanText(body.note);
    if (!note) throw bad('short day needs a note');
    return { name, type: body.type, startDate, endDate, returnDate: null, note };
  }
  const returnDate = parseDate(body.returnDate, null);
  if (!returnDate || returnDate <= endDate) throw bad('return date must follow the vacation');
  return { name, type: body.type, startDate, endDate, returnDate, note: cleanText(body.note) };
}

export function parseVacationSettings(body = {}) {
  const schoolYear = cleanText(body.schoolYear);
  if (schoolYear && schoolYear.length > 20) throw bad('invalid school year');
  return { schoolYear, summerStart: parseDate(body.summerStart, null) };
}
