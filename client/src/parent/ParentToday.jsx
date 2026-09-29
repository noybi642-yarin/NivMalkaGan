import { api, useLoad } from '../shared/api.js';
import { formatDay, greeting, supplySentence } from '../shared/copy.js';
import { ErrorState, Icon, Loading, toast } from '../shared/ui.jsx';
import DaySummary, { absentText } from './DaySummary.jsx';

export default function ParentToday({ child, familyName, kindergarten, logoutButton, switcher, goTo }) {
  const { data, setData, error, reload } = useLoad(`/parent/children/${child.id}/day`);

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
    <header className="parent-header">
      <div className="parent-header-top">
        <p className="greeting">{greeting()}, {familyName} 👋</p>
        {logoutButton}
      </div>
      {switcher}
      <h1>היום של {child.name}</h1>
      {data && <p className="subtitle">{formatDay(data.date)}</p>}
    </header>
  );

  if (error) return <>{header}<ErrorState onRetry={reload} /></>;
  if (!data) return <>{header}<Loading /></>;

  const { report, day } = data;
  const open = data.supplies.filter((s) => s.status === 'open');
  const handledToday = data.supplies.filter((s) => s.status === 'done');
  const nothingYet = !data.hasReport || (!report.absent && !report.food && !report.sleep && !report.poop && !report.mood && !report.highlight);
  const sentUpdate = data.parentUpdates.length > 0;

  return (
    <>
      {header}

      {kindergarten?.notice && (
        <section className="card card-notice">
          <span aria-hidden="true">📣</span>
          <p><strong>מהגן: </strong>{kindergarten.notice}</p>
        </section>
      )}

      {report.absent ? (
        <section className="card empty-day"><p>{absentText(child)}</p></section>
      ) : nothingYet ? (
        <section className="card empty-day">
          <span className="empty-emoji" aria-hidden="true">🌤️</span>
          <p><strong>היום רק התחיל</strong></p>
          <p className="muted">הצוות יעדכן כאן במהלך היום. אין צורך לשאול — הכל יופיע כאן.</p>
        </section>
      ) : null}

      {!report.absent && <DaySummary child={child} report={report} day={day} />}

      {open.map((s) => (
        <section className="card card-supply" key={s.id}>
          <div>
            <h2 className="card-title">למחר</h2>
            <p>{supplySentence(s)}</p>
          </div>
          <button className="btn btn-primary" onClick={() => markDone(s)}>טופל ✓</button>
        </section>
      ))}
      {open.length === 0 && handledToday.length > 0 && (
        <p className="page-pad seen">✓ סימנת שהציוד טופל</p>
      )}

      {!sentUpdate && (
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
