import { useState } from 'react';
import { FIELDS, formatDay, g, supplyLabels } from '../shared/copy.js';
import { Chip, PageHeader } from '../shared/ui.jsx';

export default function ChildrenScreen({ data, onOpenChild, logoutButton, classSwitcher }) {
  const [onlyMissing, setOnlyMissing] = useState(false);
  const list = data.children.filter((c) => !onlyMissing || (!c.report.absent && !c.report.complete));
  const missing = data.children.filter((c) => !c.report.absent && !c.report.complete).length;

  return (
    <>
      <PageHeader title="הילדים" subtitle={`${data.class.name} · ${formatDay(data.date)}`} action={logoutButton} />
      {classSwitcher}
      <div className="page-pad chips">
        <Chip on={!onlyMissing} onClick={() => setOnlyMissing(false)}>כולם</Chip>
        <Chip on={onlyMissing} onClick={() => setOnlyMissing(true)}>חסר עדכון ({missing})</Chip>
      </div>

      {list.length === 0 && <div className="empty"><p>כל הילדים עודכנו ✓</p></div>}

      <ul className="child-cards">
        {list.map((c) => {
          const openSupply = c.supplies.find((s) => s.status === 'open');
          const doneSupply = c.supplies.find((s) => s.date === data.date && s.status === 'done');
          return (
            <li key={c.id}>
              <button className={`card child-card${c.report.absent ? ' is-absent' : ''}`} onClick={() => onOpenChild(c.id)}>
                <div className="child-card-top">
                  <strong>{c.name}</strong>
                  {c.report.absent ? (
                    <span className="tag">{g(c.gender, 'לא הגיע', 'לא הגיעה')}</span>
                  ) : (
                    <span className="field-dots" aria-label="סטטוס עדכון">
                      {FIELDS.map((f) => (
                        <span key={f.key} className={`field-dot${c.report[f.key] ? ' is-set' : ''}`} title={f.label}>
                          {f.icon}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                {!c.report.absent && (
                  <p className={c.report.highlight ? 'highlight-snippet' : 'add-moment'}>
                    {c.report.highlight ? `✨ ${c.report.highlight}` : '+ רגע קטן מהיום'}
                  </p>
                )}
                {(openSupply || doneSupply || c.report.note) && (
                  <div className="child-card-tags">
                    {c.report.note && <span className="tag tag-warn">כדאי לדעת</span>}
                    {openSupply && <span className="tag tag-accent">חסר: {supplyLabels(openSupply).join(', ')}</span>}
                    {doneSupply && !openSupply && <span className="tag tag-ok">ציוד: טופל ✓</span>}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
