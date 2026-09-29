import { formatDay, greeting, parentUpdateText } from '../shared/copy.js';
import { Icon, SectionHead, TopBar } from '../shared/ui.jsx';

/** Staff home: what's waiting, what parents said this morning, and one tap to every daily task. */
export default function Dashboard({ data, user, place, logoutButton, classSwitcher, kindergarten, pending, onSeen, open }) {
  const unseen = data.children.flatMap((c) => c.parentUpdates.filter((u) => !u.seen).map((u) => ({ ...u, child: c })));
  const menuSet = Boolean(data.menu.breakfast || data.menu.lunch || data.menu.snack);
  const activityCount = data.day.activities.length;

  const tiles = [
    { name: 'batch', emoji: '⚡', tone: 'peach', title: 'עדכון מהיר לקבוצה', sub: 'אוכל, שינה ומצב רוח לכולם' },
    { name: 'children', emoji: '🧒', tone: 'rose', title: 'עדכון יומי לילד/ה', sub: 'מצב רוח, ארוחות ופעילויות' },
    { name: 'menu', emoji: '🥗', tone: 'mint', title: 'עדכון תפריט', sub: menuSet ? 'התפריט של היום עודכן ✓' : 'עוד לא עודכן היום' },
    { name: 'activities', emoji: '🎨', tone: 'sky', title: 'פעילויות וחוגים', sub: activityCount ? `${activityCount} פעילויות היום` : 'עוד לא הוגדרו היום' },
    { name: 'messages', emoji: '📢', tone: 'lilac', title: 'הודעה להורים', sub: kindergarten?.notice ? 'יש הודעה פעילה' : 'אין הודעה פעילה' },
    { name: 'vacations', emoji: '🗓️', tone: 'butter', title: 'לוח חופשות', sub: 'חגים וחופשות' },
  ];

  return (
    <>
      <TopBar place={place} title="דשבורד" action={logoutButton} />

      <section className="hello">
        <h1>{greeting()}, {user.name} <span aria-hidden="true">🌸</span></h1>
        <p className="muted">מה קורה היום בגן? · {formatDay(data.date)}</p>
      </section>

      {classSwitcher}

      <section className={`card status-card${pending.length ? '' : ' is-done'}`}>
        <div className="status-card-text">
          <span className={`badge-icon ${pending.length ? 'tone-peach' : 'tone-mint'}`} aria-hidden="true">
            {pending.length ? '⏳' : '✓'}
          </span>
          <div>
            <p className="strong">
              {pending.length ? `${pending.length} ילדים ממתינים לעדכון` : 'כל הילדים עודכנו'}
            </p>
            <p className="muted small">
              {pending.length ? `ב${data.class.name} · ההורים מחכים לשמוע איך עבר היום` : `ב${data.class.name} · ההורים כבר רואים את היום`}
            </p>
          </div>
        </div>
        {pending.length > 0 && (
          <button className="btn btn-primary btn-block" onClick={() => open('batch')}>
            <Icon name="bolt" size={20} /> המשך עדכון מהיר לקבוצה
          </button>
        )}
      </section>

      {unseen.length > 0 && (
        <section className="card">
          <SectionHead emoji="💌" tone="lilac" title="הודעות מההורים הבוקר" />
          <ul className="note-list">
            {unseen.map((u) => (
              <li key={u.id}>
                <div>
                  <p><strong>{u.child.name}</strong> · {parentUpdateText(u, u.child.gender)}</p>
                  {u.note && <p className="muted small">{u.note}</p>}
                </div>
                <button className="btn btn-small btn-soft" onClick={() => onSeen(u.id)}>ראיתי</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tiles-section">
        <h2 className="section-title">פעולות מהירות</h2>
        <div className="tiles">
          {tiles.map((t) => (
            <button key={t.name} className={`tile tone-${t.tone}`} onClick={() => open(t.name)}>
              <span className="tile-icon" aria-hidden="true">{t.emoji}</span>
              <strong>{t.title}</strong>
              <span>{t.sub}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
