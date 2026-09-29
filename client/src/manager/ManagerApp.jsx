import { useState } from 'react';
import { useLoad } from '../shared/api.js';
import {
  FIELDS,
  formatDay,
  g,
  parentUpdateText,
  supplyLabels,
} from '../shared/copy.js';
import { ErrorState, IconButton, Loading, PageHeader, Progress, Shell } from '../shared/ui.jsx';

const TABS = [
  { key: 'today', label: 'היום', icon: 'today' },
  { key: 'classes', label: 'הכיתות', icon: 'classes' },
  { key: 'admin', label: 'ניהול', icon: 'settings' },
];

export default function ManagerApp({ onLogout }) {
  const [tab, setTab] = useState('today');
  const [classId, setClassId] = useState(null);
  const logoutButton = <IconButton icon="logout" label="יציאה" onClick={onLogout} />;
  const openClass = (id) => {
    setClassId(id);
    setTab('classes');
  };

  return (
    <Shell tabs={TABS} tab={tab} onTab={setTab}>
      {tab === 'today' && <Overview logoutButton={logoutButton} onClass={openClass} />}
      {tab === 'classes' && <Classes logoutButton={logoutButton} classId={classId} onClass={setClassId} />}
      {tab === 'admin' && <Admin logoutButton={logoutButton} onLogout={onLogout} />}
    </Shell>
  );
}

function Overview({ logoutButton, onClass }) {
  const { data, error, reload } = useLoad('/manager/overview');
  if (error) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;
  const { totals } = data;

  return (
    <>
      <PageHeader eyebrow={data.kindergarten.name} title="הגן שלי" subtitle={formatDay(data.date)} action={logoutButton} />

      <div className="stats">
        <Stat value={totals.present} of={totals.children} label="ילדים בגן היום" />
        <Stat value={totals.complete} of={totals.present} label="עודכנו להורים" />
        <Stat value={totals.openSupplies} label="בקשות ציוד פתוחות" tone={totals.openSupplies ? 'accent' : null} />
        <Stat value={data.attention.length} label="דורש תשומת לב" tone={data.attention.length ? 'warn' : null} />
      </div>

      <section className="card">
        <h2 className="card-title">עדכון לפי כיתה</h2>
        <ul className="class-progress">
          {data.classes.map((c) => (
            <li key={c.id}>
              <button onClick={() => onClass(c.id)}>
                <span className="class-progress-label">
                  <strong>{c.name}</strong> — {c.pct}% עודכנו
                </span>
                <Progress value={c.complete} total={c.present} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {data.attention.length > 0 && (
        <section className="card">
          <h2 className="card-title">דורש תשומת לב</h2>
          <ul className="attention">
            {data.attention.map((a) => (
              <li key={`${a.kind}-${a.id ?? a.childId}`}>
                <span className="attention-icon" aria-hidden="true">{a.kind === 'parent' ? '✉️' : '📌'}</span>
                <div>
                  <p><strong>{a.childName}</strong> <span className="muted small">· {a.className}</span></p>
                  <p>{a.kind === 'parent' ? parentUpdateText(a, a.gender) : a.note}</p>
                  {a.kind === 'parent' && a.note && <p className="muted small">{a.note}</p>}
                  {a.kind === 'parent' && <p className="small muted">הצוות עוד לא ראה</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Stat({ value, of, label, tone }) {
  return (
    <div className={`stat${tone ? ` stat-${tone}` : ''}`}>
      <strong>{value}{of != null && <small>/{of}</small>}</strong>
      <span>{label}</span>
    </div>
  );
}

function Classes({ logoutButton, classId, onClass }) {
  const structure = useLoad('/manager/structure');
  const classes = structure.data?.classes ?? [];
  const active = classId ?? classes[0]?.id;
  const { data } = useLoad(active ? `/manager/classes/${active}` : null);

  return (
    <>
      <PageHeader title="הכיתות" subtitle={data ? `${data.class.pct}% עודכנו · ${data.class.present} ילדים בגן` : ''} action={logoutButton} />
      <div className="page-pad">
        <div className="child-switch" role="tablist">
          {classes.map((c) => (
            <button key={c.id} role="tab" aria-selected={c.id === active} className={c.id === active ? 'is-on' : ''}
              onClick={() => onClass(c.id)}>{c.name}</button>
          ))}
        </div>
      </div>
      {!data ? <Loading /> : (
        <ul className="card manager-rows">
          {data.children.map((c) => (
            <li key={c.id}>
              <span className={`status-dot${c.report.complete ? ' is-complete' : ''}`} />
              <strong>{c.name}</strong>
              {c.report.absent ? (
                <span className="tag">{g(c.gender, 'לא הגיע', 'לא הגיעה')}</span>
              ) : (
                <span className="field-dots">
                  {FIELDS.map((f) => (
                    <span key={f.key} className={`field-dot${c.report[f.key] ? ' is-set' : ''}`} title={f.label}>{f.icon}</span>
                  ))}
                </span>
              )}
              {c.supplies[0] && <span className="tag tag-accent">חסר: {supplyLabels(c.supplies[0]).join(', ')}</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Admin({ logoutButton, onLogout }) {
  const { data } = useLoad('/manager/structure');
  if (!data) return <Loading />;
  return (
    <>
      <PageHeader eyebrow={data.kindergarten.name} title="ניהול" action={logoutButton} />
      <section className="card">
        <h2 className="card-title">כיתות וצוות</h2>
        <ul className="admin-list">
          {data.classes.map((c) => (
            <li key={c.id}>
              <strong>{c.name}</strong>
              <span className="muted">{c.childCount} ילדים · {c.staff.join(', ') || 'אין צוות משויך'}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">{data.parentCount} הורים מחוברים לאפליקציה</p>
      </section>
      <p className="page-pad muted small">הוספת ילדים, הורים ואנשי צוות נעשית בהקמת הגן. לשינויים — פנו לתמיכה.</p>
      <div className="page-pad">
        <button className="btn btn-ghost btn-block" onClick={onLogout}>יציאה מהחשבון</button>
      </div>
    </>
  );
}
