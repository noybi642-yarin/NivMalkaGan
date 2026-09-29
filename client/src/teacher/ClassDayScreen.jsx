import { useState } from 'react';
import { api, useLoad } from '../shared/api.js';
import { ACTIVITY_PRESETS, activityIcon, formatDay } from '../shared/copy.js';
import { AutoText, Chip, PageHeader, toast } from '../shared/ui.jsx';

export default function ClassDayScreen({ data, saveDay, logoutButton, classSwitcher }) {
  const { day } = data;
  const [custom, setCustom] = useState('');
  const options = [...new Set([...ACTIVITY_PRESETS, ...day.activities])];

  const save = (patch) => saveDay({ ...day, ...patch });

  function toggleActivity(a) {
    save({ activities: day.activities.includes(a) ? day.activities.filter((x) => x !== a) : [...day.activities, a] });
  }

  function addCustom(e) {
    e.preventDefault();
    const a = custom.trim();
    if (a && !day.activities.includes(a)) save({ activities: [...day.activities, a] });
    setCustom('');
  }

  return (
    <>
      <PageHeader title="הגן היום" subtitle={formatDay(data.date)} action={logoutButton} />
      {classSwitcher}
      <p className="page-pad muted">ממלאים פעם אחת — מופיע אצל כל ההורים של {data.class.name}.</p>

      <section className="card">
        <h2 className="card-title">תפריט היום</h2>
        <MenuField label="בוקר" value={day.menuBreakfast} placeholder="כריך גבינה וירקות"
          onSave={(v) => save({ menuBreakfast: v })} />
        <MenuField label="צהריים" value={day.menuLunch} placeholder="קציצות, אורז וירקות"
          onSave={(v) => save({ menuLunch: v })} />
      </section>

      <section className="card">
        <h2 className="card-title">מה עשינו היום?</h2>
        <div className="chips">
          {options.map((a) => (
            <Chip key={a} on={day.activities.includes(a)} onClick={() => toggleActivity(a)}>
              <span aria-hidden="true">{activityIcon(a)}</span> {a}
            </Chip>
          ))}
        </div>
        <form className="inline-form" onSubmit={addCustom}>
          <input className="input" placeholder="פעילות אחרת…" maxLength={40} value={custom}
            onChange={(e) => setCustom(e.target.value)} />
          <button className="btn btn-soft" disabled={!custom.trim()}>הוספה</button>
        </form>
      </section>

      <GanInfo />
    </>
  );
}

/** General kindergarten information — shown to all parents of the kindergarten. */
function GanInfo() {
  const { data, setData } = useLoad('/kindergarten');
  if (!data) return null;
  const info = data.kindergarten;

  async function save(patch) {
    const next = { ...info, ...patch };
    setData({ kindergarten: next });
    try {
      const res = await api('/staff/kindergarten', { method: 'PUT', body: next });
      setData(res);
    } catch {
      toast('השמירה לא הצליחה. נסו שוב');
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">מידע כללי להורים</h2>
      <p className="muted small field-hint">מופיע אצל כל ההורים בגן</p>
      <label className="field">
        <span>הודעה להורים</span>
        <AutoText label="הודעה להורים" value={info.notice} rows={2} placeholder="למשל: ביום חמישי מסיבת סוכות"
          onSave={(v) => save({ notice: v })} />
      </label>
      <MenuField label="שעות פעילות" value={info.hours} placeholder="א׳–ה׳ 07:30–16:00" onSave={(v) => save({ hours: v })} />
      <MenuField label="טלפון הגן" value={info.phone} placeholder="03-0000000" onSave={(v) => save({ phone: v })} />
    </section>
  );
}

function MenuField({ label, value, placeholder, onSave }) {
  const [draft, setDraft] = useState(value ?? '');
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" value={draft} placeholder={placeholder} maxLength={120}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() !== (value ?? '') && onSave(draft.trim() || null)} />
    </label>
  );
}
