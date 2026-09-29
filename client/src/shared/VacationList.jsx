import { ltr } from './copy.js';
import { Icon } from './ui.jsx';

const SOON_DAYS = 7;

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
                <h2>{item.name}</h2>
                {label && <span className={`tag${status === 'during' ? ' tag-warn' : ''}`}>{label}</span>}
                {onEdit && <span className="vacation-edit"><Icon name="edit" size={18} /></span>}
              </div>
              <p className="vacation-when">
                <strong>{ltr(item.displayDate)}</strong>
                <span className="muted"> · {item.weekdays}</span>
              </p>
              <p className="vacation-return">
                <span className={`vacation-dot${item.type === 'short_day' ? ' is-short' : ''}`} aria-hidden="true" />
                {item.type === 'short_day' ? item.note : `חזרה לגן: ${item.returnDay}, ${item.returnDate}`}
              </p>
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
          <span aria-hidden="true">☀️</span>
          <p>{schedule.summer.text}</p>
        </section>
      )}
    </>
  );
}
