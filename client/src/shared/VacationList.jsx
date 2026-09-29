import { ltr } from './copy.js';
import { Icon } from './ui.jsx';

const SOON_DAYS = 7;

const HOLIDAY_EMOJI = [
  ['ראש השנה', '🍎'], ['כיפור', '🕊️'], ['שמחת תורה', '🍋'], ['סוכות', '🌿'], ['חנוכה', '🕎'], ['פורים', '🎭'],
  ['פסח', '🍷'], ['הזיכרון', '🕯️'], ['העצמאות', '🇮🇱'], ['שבועות', '🌾'], ['צוות', '📚'],
];
const holidayEmoji = (name) => HOLIDAY_EMOJI.find(([key]) => name.includes(key))?.[1] ?? '🗓️';

const todayIL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/** 'during' | 'soon' | 'past' | null */
export function vacationStatus(item, today) {
  if (today > item.endDate) return 'past';
  if (today >= item.startDate) return 'during';
  if (daysBetween(today, item.startDate) <= SOON_DAYS) return 'soon';
  return null;
}

function statusLabel(item, status) {
  if (status === 'soon') return 'בקרוב';
  if (status === 'during') return item.type === 'short_day' ? 'היום מסיימים ב־12:00' : 'הגן בחופשה';
  return null;
}

/** The vacation calendar, rendered from the schedule the API returns. onEdit makes cards editable (staff). */
export default function VacationList({ schedule, onEdit }) {
  const today = todayIL();
  return (
    <>
      <ul className="vacations">
        {schedule.items.map((item) => {
          const status = vacationStatus(item, today);
          const label = statusLabel(item, status);
          const body = (
            <>
              <div className="vacation-top">
                <span className="vacation-emoji" aria-hidden="true">{holidayEmoji(item.name)}</span>
                <div className="vacation-title">
                  <h2>{item.name}</h2>
                  <p className="vacation-when">
                    <strong>{ltr(item.displayDate)}</strong>
                    <span className="muted"> · {item.weekdays}</span>
                  </p>
                </div>
                {label && <span className={`pill ${status === 'during' ? 'pill-pending' : 'pill-soft'}`}>{label}</span>}
                {onEdit && <span className="vacation-edit"><Icon name="edit" size={18} /></span>}
              </div>
              {item.type === 'short_day' ? (
                <p className="vacation-return is-short"><span aria-hidden="true">🕐</span> {item.note}</p>
              ) : (
                <p className="vacation-return"><span aria-hidden="true">👋</span> חזרה לגן: {item.returnDay}, {item.returnDate}</p>
              )}
            </>
          );
          const className = `card vacation${status === 'past' ? ' is-past' : ''}`;
          return (
            <li key={item.id}>
              {onEdit ? (
                <button className={className} onClick={() => onEdit(item)} aria-label={`עריכת ${item.name}`}>{body}</button>
              ) : (
                <div className={className}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {schedule.summer && (
        <section className="card vacation-summer">
          <span className="pill pill-soft">החופש הגדול <span aria-hidden="true">🏖️</span></span>
          <p className="vacation-summer-text">{schedule.summer.text}</p>
          <span className="vacation-summer-deco" aria-hidden="true">☀️</span>
        </section>
      )}
    </>
  );
}
