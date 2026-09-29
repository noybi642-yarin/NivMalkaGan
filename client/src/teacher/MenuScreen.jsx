import { useState } from 'react';
import { MENU_MEALS, formatDay } from '../shared/copy.js';
import { SectionHead, TopBar, toast } from '../shared/ui.jsx';

const PLACEHOLDERS = {
  breakfast: 'כריך גבינה וירקות',
  lunch: 'קציצות, אורז וירקות',
  snack: 'פלחי תפוח ועוגייה',
};

/** עדכון תפריט — once a day for the whole kindergarten; every parent sees it. */
export default function MenuScreen({ data, place, menu, onSave, onBack }) {
  const [draft, setDraft] = useState({ breakfast: menu.breakfast ?? '', lunch: menu.lunch ?? '', snack: menu.snack ?? '' });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const ok = await onSave(draft);
    setBusy(false);
    if (ok) {
      toast('התפריט נשמר ✓');
      onBack();
    }
  }

  return (
    <>
      <TopBar place={place} title="עדכון תפריט" onBack={onBack} />
      <main className="main main-plain with-savebar">
        <section className="hello">
          <h1>מה אוכלים היום? <span aria-hidden="true">🥗</span></h1>
          <p className="muted">{formatDay(data.date)} · פעם אחת לכל הגן, מופיע אצל כל ההורים</p>
        </section>
        <section className="card">
          <SectionHead emoji="🍎" tone="mint" title="תפריט היום" />
          {MENU_MEALS.map((m) => (
            <label className="field" key={m.key}>
              <span>{m.emoji} {m.label}</span>
              <input className="input" maxLength={120} value={draft[m.key]} placeholder={PLACEHOLDERS[m.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [m.key]: e.target.value }))} />
            </label>
          ))}
          <p className="muted small">בעדכון של כל ילד/ה מסמנים רק איך אכל/ה — לא צריך לכתוב שוב את התפריט.</p>
        </section>
      </main>
      <div className="savebar">
        <button className="btn btn-primary btn-block btn-big" disabled={busy} onClick={save}>שמירת התפריט</button>
      </div>
    </>
  );
}
