import { ltr } from '../shared/copy.js';
import { PageHeader } from '../shared/ui.jsx';
import { VACATION_SCHEDULE, vacationStatus } from './vacations.js';

const todayIL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

function statusLabel(item, status) {
  if (status === 'soon') return 'בקרוב';
  if (status === 'during') return item.type === 'short_day' ? 'היום מסיימים ב־12:00' : 'הגן בחופשה';
  return null;
}

export default function Vacations({ logoutButton, schedule = VACATION_SCHEDULE }) {
  const today = todayIL();

  return (
    <>
      <PageHeader title={schedule.title} subtitle={schedule.subtitle} action={logoutButton} />

      <ul className="vacations">
        {schedule.items.map((item) => {
          const status = vacationStatus(item, today);
          const label = statusLabel(item, status);
          return (
            <li key={`${item.name}-${item.startDate}`} className={`card vacation${status === 'past' ? ' is-past' : ''}`}>
              <div className="vacation-top">
                <h2>{item.name}</h2>
                {label && <span className={`tag${status === 'during' ? ' tag-warn' : ''}`}>{label}</span>}
              </div>
              <p className="vacation-when">
                <strong>{ltr(item.displayDate)}</strong>
                <span className="muted"> · {item.weekdays}</span>
              </p>
              <p className="vacation-return">
                <span className={`vacation-dot${item.type === 'short_day' ? ' is-short' : ''}`} aria-hidden="true" />
                {item.type === 'short_day' ? item.note : `חזרה לגן: ${item.returnDay}, ${item.returnDate}`}
              </p>
            </li>
          );
        })}
      </ul>

      <section className="card vacation-summer">
        <span aria-hidden="true">☀️</span>
        <p>{schedule.summer.text}</p>
      </section>
    </>
  );
}
