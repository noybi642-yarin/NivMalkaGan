import { useState } from 'react';
import { MOOD, childStatus, foodLabel, g, statusLabel, supplyLabels } from '../shared/copy.js';
import { Avatar, StatusPill, TopBar } from '../shared/ui.jsx';

/** The main meal's rating for the card snapshot (lunch first). */
const eaten = (r) => r.food_lunch ?? r.food_breakfast ?? r.food_snack;

const FILTERS = [
  { key: 'all', label: 'הכל' },
  { key: 'pending', label: 'ממתינים לעדכון' },
  { key: 'done', label: 'עודכנו' },
  { key: 'absent', label: 'נעדרים' },
];

export default function ChildrenScreen({ data, place, logoutButton, classSwitcher, onOpenChild }) {
  const [filter, setFilter] = useState('all');
  const withStatus = data.children.map((c) => ({ ...c, status: childStatus(c.report) }));
  const count = (key) => (key === 'all' ? withStatus.length : withStatus.filter((c) => c.status === key).length);
  const list = withStatus.filter((c) => filter === 'all' || c.status === filter);

  return (
    <>
      <TopBar place={place} title="ילדי הגן" action={logoutButton} />
      <section className="hello">
        <h1>הילדים שלנו <span aria-hidden="true">🌈</span></h1>
        <p className="muted">{data.class.name} · {data.children.length} ילדים</p>
      </section>
      {classSwitcher}

      <div className="filter-row" role="tablist" aria-label="סינון">
        {FILTERS.map((f) => (
          <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'is-on' : ''}
            onClick={() => setFilter(f.key)}>
            {f.label} <small>{count(f.key)}</small>
          </button>
        ))}
      </div>

      {list.length === 0 && <div className="empty"><p>אין ילדים ברשימה הזו ✓</p></div>}

      <ul className="child-cards">
        {list.map((c) => {
          const mood = MOOD.find((m) => m.value === c.report.mood);
          const openSupply = c.supplies.find((s) => s.status === 'open');
          return (
            <li key={c.id} className={`card child-card is-${c.status}`}>
              <button className="child-card-head" onClick={() => onOpenChild(c.id)}>
                <Avatar name={c.name} />
                <span className="child-card-name">
                  <strong>{c.name}</strong>
                  {c.parentUpdates.some((u) => !u.seen) && <span className="muted small">💌 הודעה מההורים</span>}
                </span>
                <StatusPill status={c.status}>{statusLabel(c.status, c.gender)}</StatusPill>
              </button>

              {(mood || eaten(c.report)) && c.status !== 'absent' && (
                <div className="snapshot">
                  {mood && <span>{mood.emoji} {mood.label(c.gender)}</span>}
                  {eaten(c.report) && <span>🍽️ {foodLabel(eaten(c.report), c.gender)}</span>}
                </div>
              )}
              {c.report.highlight && <p className="snapshot-line lilac">🌟 {c.report.highlight}</p>}
              {c.report.note && <p className="snapshot-line butter">💛 {c.report.note}</p>}
              {openSupply && <p className="snapshot-line peach">🎒 חסר: {supplyLabels(openSupply).join(', ')}</p>}

              {c.status === 'pending' && (
                <button className="btn btn-primary btn-block" onClick={() => onOpenChild(c.id)}>
                  + עדכון יומי ל{c.name}
                </button>
              )}
              {c.status === 'done' && (
                <button className="btn btn-quiet" onClick={() => onOpenChild(c.id)}>עריכה</button>
              )}
              {c.status === 'absent' && (
                <button className="btn btn-quiet" onClick={() => onOpenChild(c.id)}>{g(c.gender, 'הגיע בכל זאת?', 'הגיעה בכל זאת?')}</button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
