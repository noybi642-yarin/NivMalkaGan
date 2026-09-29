import { api, useLoad } from '../shared/api.js';
import { SUPPLY_TITLE, formatDay, greeting, ltr, supplyLabels } from '../shared/copy.js';
import { Avatar, ErrorState, Icon, Loading, SectionHead, TopBar, toast } from '../shared/ui.jsx';
import { vacationStatus } from '../shared/VacationList.jsx';
import DaySummary, { absentText } from './DaySummary.jsx';

const todayIL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

/** היום של [שם] — the parent's home screen. */
export default function ParentToday({ child, familyName, kindergarten, logoutButton, switcher, goTo }) {
  const { data, setData, error, reload } = useLoad(`/parent/children/${child.id}/day`);
  const vacations = useLoad('/vacations');

  async function markDone(supply) {
    setData((d) => ({ ...d, supplies: d.supplies.map((s) => (s.id === supply.id ? { ...s, status: 'done' } : s)) }));
    try {
      await api(`/parent/supplies/${supply.id}/done`, { method: 'POST' });
      toast('תודה! הצוות יראה שזה טופל');
    } catch {
      toast('לא הצלחנו לשמור. נסו שוב');
      reload();
    }
  }

  const header = (
    <>
      <TopBar place={kindergarten?.name} title="היום" action={logoutButton} />
      <section className="card greeting-card">
        <Avatar name={child.name} size="lg" />
        <div className="greeting-card-text">
          <p className="strong">{greeting()}, {familyName} <span aria-hidden="true">👋</span></p>
          <h1>היום של {child.name}</h1>
          <p className="muted small">{child.className}{data ? ` · ${formatDay(data.date)}` : ''}</p>
        </div>
      </section>
      {switcher && <div className="page-pad">{switcher}</div>}
    </>
  );

  if (error) return <>{header}<ErrorState onRetry={reload} /></>;
  if (!data) return <>{header}<Loading /></>;

  const { report, day, menu } = data;
  const open = data.supplies.filter((s) => s.status === 'open');
  const handledToday = data.supplies.filter((s) => s.status === 'done');
  const nothingYet = !report.absent && !report.mood && !report.food_breakfast && !report.food_lunch && !report.food_snack
    && !report.highlight && !report.note && !report.sleep_quality && !report.poop;
  const today = todayIL();
  const nextVacation = vacations.data?.items.find((v) => vacationStatus(v, today) !== 'past');

  return (
    <>
      {header}

      {report.absent ? (
        <section className="card empty-day"><p>{absentText(child)}</p></section>
      ) : (
        <>
          {nothingYet && (
            <section className="card empty-day">
              <span className="empty-emoji" aria-hidden="true">🌤️</span>
              <p className="strong">היום רק התחיל</p>
              <p className="muted">הצוות יעדכן כאן במהלך היום. אין צורך לשאול — הכל יופיע כאן.</p>
            </section>
          )}
          <DaySummary child={child} report={report} day={day} menu={menu} />
        </>
      )}

      {open.map((s) => (
        <section className="card card-supply" key={s.id}>
          <h2 className="card-title">🎒 {SUPPLY_TITLE}</h2>
          <ul className="supply-list">
            {supplyLabels(s).map((label) => <li key={label}><span aria-hidden="true">✓</span> {label}</li>)}
          </ul>
          <button className="btn btn-primary btn-block" onClick={() => markDone(s)}>טופל ✓</button>
        </section>
      ))}
      {open.length === 0 && handledToday.length > 0 && <p className="page-pad seen">✓ סימנת שהציוד טופל</p>}

      {kindergarten?.notice && (
        <section className="card">
          <SectionHead emoji="📢" tone="mint" title="הודעות מהגן" />
          <p className="notice-text">{kindergarten.notice}</p>
        </section>
      )}

      {nextVacation && (
        <button className="card card-link vacation-teaser" onClick={() => goTo('vacations')}>
          <span className="badge-icon tone-butter" aria-hidden="true">🗓️</span>
          <span className="vacation-teaser-text">
            <span className="eyebrow-label">לוח חופשות</span>
            <strong>
              {vacationStatus(nextVacation, today) === 'during' ? 'עכשיו: ' : 'החופשה הקרובה: '}
              {nextVacation.name}
            </strong>
            <span className="muted small">
              {ltr(nextVacation.displayDate)}
              {nextVacation.returnDate ? ` · חזרה לגן ${nextVacation.returnDay}` : ` · ${nextVacation.note}`}
            </span>
          </span>
          <Icon name="chevron" size={20} />
        </button>
      )}

      {data.parentUpdates.length === 0 && (
        <button className="card card-link" onClick={() => goTo('update')}>
          <span>
            <strong>משהו שהגן צריך לדעת היום?</strong>
            <span className="muted"> עדכון לגן בשתי לחיצות</span>
          </span>
          <Icon name="chevron" size={20} />
        </button>
      )}
    </>
  );
}
