// The kindergarten's official vacation schedule. To publish next year's schedule, replace this object.
// Dates are ISO (YYYY-MM-DD) and drive the automatic status; display strings are shown as written.

export const VACATION_SCHEDULE = {
  title: 'לוח חופשות תשפ״ז',
  subtitle: 'מועדי החופשות והחזרה לגן',
  items: [
    {
      name: 'ראש השנה',
      type: 'holiday',
      startDate: '2026-09-11',
      endDate: '2026-09-13',
      displayDate: '11.09 + 13.09',
      weekdays: 'שישי וראשון',
      returnDate: '14.09.2026',
      returnDay: 'יום שני',
    },
    {
      name: 'יום כיפור',
      type: 'holiday',
      startDate: '2026-09-20',
      endDate: '2026-09-21',
      displayDate: '20–21.09',
      weekdays: 'ראשון–שני',
      returnDate: '22.09.2026',
      returnDay: 'יום שלישי',
    },
    {
      name: 'סוכות',
      type: 'holiday',
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      displayDate: '25.09',
      weekdays: 'שישי',
      returnDate: '27.09.2026',
      returnDay: 'יום ראשון',
    },
    {
      name: 'חול המועד סוכות ושמחת תורה',
      type: 'holiday',
      startDate: '2026-09-30',
      endDate: '2026-10-02',
      displayDate: '30.09–02.10',
      weekdays: 'רביעי–שישי',
      returnDate: '04.10.2026',
      returnDay: 'יום ראשון',
    },
    {
      name: 'חנוכה',
      type: 'holiday',
      startDate: '2026-12-09',
      endDate: '2026-12-11',
      displayDate: '09–11.12',
      weekdays: 'רביעי–שישי',
      returnDate: '13.12.2026',
      returnDay: 'יום ראשון',
    },
    {
      name: 'יום צוות',
      type: 'staff_day',
      startDate: '2027-01-29',
      endDate: '2027-01-29',
      displayDate: '29.01',
      weekdays: 'שישי',
      returnDate: '31.01.2027',
      returnDay: 'יום ראשון',
    },
    {
      name: 'פורים',
      type: 'holiday',
      startDate: '2027-03-23',
      endDate: '2027-03-24',
      displayDate: '23–24.03',
      weekdays: 'שלישי–רביעי',
      returnDate: '25.03.2027',
      returnDay: 'יום חמישי',
    },
    {
      name: 'פסח',
      type: 'holiday',
      startDate: '2027-04-19',
      endDate: '2027-04-28',
      displayDate: '19–28.04',
      weekdays: 'שני–רביעי',
      returnDate: '29.04.2027',
      returnDay: 'יום חמישי',
    },
    {
      name: 'יום הזיכרון',
      type: 'short_day',
      startDate: '2027-05-11',
      endDate: '2027-05-11',
      displayDate: '11.05',
      weekdays: 'שלישי',
      note: 'הגן פתוח עד 12:00',
    },
    {
      name: 'יום העצמאות',
      type: 'holiday',
      startDate: '2027-05-12',
      endDate: '2027-05-12',
      displayDate: '12.05',
      weekdays: 'רביעי',
      returnDate: '13.05.2027',
      returnDay: 'יום חמישי',
    },
    {
      name: 'שבועות',
      type: 'holiday',
      startDate: '2027-06-10',
      endDate: '2027-06-11',
      displayDate: '10–11.06',
      weekdays: 'חמישי ושישי',
      returnDate: '13.06.2027',
      returnDay: 'יום ראשון',
    },
    {
      name: 'יום צוות',
      type: 'staff_day',
      startDate: '2027-07-09',
      endDate: '2027-07-09',
      displayDate: '09.07',
      weekdays: 'שישי',
      returnDate: '11.07.2027',
      returnDay: 'יום ראשון',
    },
  ],
  summer: {
    startDate: '2027-08-06',
    text: 'יוצאים לחופשת קיץ ביום שישי, 06.08.2027',
  },
};

const SOON_DAYS = 7;

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/** 'during' | 'soon' | 'past' | null for a schedule item on a given date (YYYY-MM-DD). */
export function vacationStatus(item, today) {
  if (today > item.endDate) return 'past';
  if (today >= item.startDate) return 'during';
  if (daysBetween(today, item.startDate) <= SOON_DAYS) return 'soon';
  return null;
}
