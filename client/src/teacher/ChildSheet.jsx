import { useState } from 'react';
import { FOOD, MOOD, POOP, SUPPLIES, formatDayShort, g, parentUpdateText } from '../shared/copy.js';
import { AutoText, Chip, Icon, Segmented, Sheet } from '../shared/ui.jsx';
import SleepEditor from './SleepEditor.jsx';

export default function ChildSheet({ child, date, position, onClose, onNext, patchChild, setSupplies, markSeen }) {
  const { report } = child;
  const gd = child.gender;

  return (
    <Sheet open onClose={onClose} label={child.name}>
      <div className="sheet-head">
        <div>
          <h2 className="sheet-title">{child.name}</h2>
          <span className="muted">{position}</span>
        </div>
        <div className="sheet-head-actions">
          <button className="btn btn-soft" onClick={onNext}>הבא ←</button>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה"><Icon name="close" size={20} /></button>
        </div>
      </div>

      {child.parentUpdates.map((u) => (
        <div className={`parent-note card-warm${u.seen ? ' is-seen' : ''}`} key={u.id}>
          <div>
            <strong>מההורים:</strong> {parentUpdateText(u, gd)}
            {u.note && <p className="muted">{u.note}</p>}
          </div>
          {u.seen ? <span className="seen">✓ נקרא</span> : (
            <button className="btn btn-small" onClick={() => markSeen(u.id)}>ראיתי</button>
          )}
        </div>
      ))}

      <label className="switch-row">
        <span>{g(gd, 'הגיע לגן היום', 'הגיעה לגן היום')}</span>
        <input type="checkbox" className="switch" checked={!report.absent}
          onChange={(e) => patchChild(child.id, { absent: !e.target.checked })} />
      </label>

      {!report.absent && (
        <>
          <section className="sheet-section">
            <h3>אוכל</h3>
            <Segmented label="אוכל" options={FOOD} value={report.food} onChange={(v) => patchChild(child.id, { food: v })} />
          </section>
          <section className="sheet-section">
            <h3>שינה</h3>
            <SleepEditor value={report.sleep} gender={gd} onChange={(v) => patchChild(child.id, { sleep: v })} />
          </section>
          <section className="sheet-section">
            <h3>יציאה</h3>
            <Segmented label="יציאה" options={POOP} value={report.poop} onChange={(v) => patchChild(child.id, { poop: v })} />
          </section>
          <section className="sheet-section">
            <h3>איך עבר היום?</h3>
            <Segmented label="איך עבר היום" options={MOOD} value={report.mood} onChange={(v) => patchChild(child.id, { mood: v })} />
          </section>
          <section className="sheet-section">
            <h3>רגע קטן מהיום <small className="muted">לא חובה</small></h3>
            <AutoText label="רגע קטן מהיום" value={report.highlight}
              placeholder={`למשל: ${child.name} ${g(gd, 'ניסה', 'ניסתה')} היום לאכול לבד עם כפית`}
              onSave={(v) => patchChild(child.id, { highlight: v })} />
          </section>
          <section className="sheet-section">
            <h3>כדאי לדעת <small className="muted">לא חובה</small></h3>
            <AutoText label="כדאי לדעת" value={report.note} rows={1}
              placeholder="משהו שההורים צריכים לדעת"
              onSave={(v) => patchChild(child.id, { note: v })} />
          </section>
        </>
      )}

      <SupplyPicker child={child} date={date} setSupplies={setSupplies} />

      <button className="btn btn-primary btn-block sheet-done" onClick={onClose}>סיום</button>
    </Sheet>
  );
}

function SupplyPicker({ child, date, setSupplies }) {
  const todays = child.supplies.find((s) => s.date === date) ?? null;
  const older = child.supplies.filter((s) => s !== todays);
  const items = todays?.items ?? [];
  const [otherText, setOtherText] = useState(todays?.otherText ?? '');

  function toggle(value) {
    const next = items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
    setSupplies(child.id, next, next.includes('other') ? otherText : null);
  }

  return (
    <section className="sheet-section">
      <h3>חסר בתיק</h3>
      <div className="chips">
        {SUPPLIES.map((s) => (
          <Chip key={s.value} on={items.includes(s.value)} onClick={() => toggle(s.value)}>{s.label}</Chip>
        ))}
      </div>
      {items.includes('other') && (
        <input className="input" placeholder="מה חסר?" maxLength={60} value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          onBlur={() => otherText !== (todays?.otherText ?? '') && setSupplies(child.id, items, otherText)} />
      )}
      {todays?.status === 'done' && <p className="seen">✓ ההורים סימנו: טופל</p>}
      {older.filter((s) => s.status === 'open').map((s) => (
        <p className="muted" key={s.id}>עדיין פתוח מ{formatDayShort(s.date)}</p>
      ))}
    </section>
  );
}
