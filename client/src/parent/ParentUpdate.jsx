import { useState } from 'react';
import { api, useLoad } from '../shared/api.js';
import { PARENT_UPDATES, formatTime, parentUpdateText } from '../shared/copy.js';
import { Chip, PageHeader, toast } from '../shared/ui.jsx';

const NOTE_HINTS = {
  early_pickup: 'באיזו שעה?',
  other_pickup: 'מי אוסף/ת?',
  other: 'מה חשוב שנדע?',
};

export default function ParentUpdate({ child, logoutButton, switcher }) {
  const { data, setData } = useLoad(`/parent/children/${child.id}/day`);
  const [types, setTypes] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const hint = [...types].reverse().map((t) => NOTE_HINTS[t]).find(Boolean) ?? 'הערה קצרה (לא חובה)';
  const canSend = types.length > 0 || note.trim();

  function toggle(value) {
    setTypes((t) => (t.includes(value) ? t.filter((x) => x !== value) : [...t, value]));
  }

  async function send() {
    setBusy(true);
    try {
      const res = await api(`/parent/children/${child.id}/updates`, { method: 'POST', body: { types, note } });
      setData((d) => ({ ...d, parentUpdates: res.parentUpdates }));
      setTypes([]);
      setNote('');
      toast('נשלח לגן ✓');
    } catch {
      toast('לא הצלחנו לשלוח. נסו שוב');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="עדכון לגן" subtitle={`משהו שהצוות צריך לדעת על ${child.name} היום?`} action={logoutButton} />
      {switcher && <div className="page-pad">{switcher}</div>}

      <section className="card">
        <div className="chips chips-stack">
          {PARENT_UPDATES.map((p) => (
            <Chip key={p.value} on={types.includes(p.value)} onClick={() => toggle(p.value)}>
              <span aria-hidden="true">{p.icon}</span> {p.label(child.gender)}
            </Chip>
          ))}
        </div>
        <textarea className="input" rows={2} maxLength={280} placeholder={hint} aria-label="הערה"
          value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn-primary btn-block" disabled={!canSend || busy} onClick={send}>שליחה לגן</button>
      </section>

      {data?.parentUpdates?.length > 0 && (
        <section className="sent">
          <h2 className="section-title">נשלח היום</h2>
          {data.parentUpdates.map((u) => (
            <div className="card sent-item" key={u.id}>
              <div>
                <p>{parentUpdateText(u, child.gender) || 'הערה'}</p>
                {u.note && <p className="muted">{u.note}</p>}
              </div>
              <span className={u.seen ? 'seen' : 'muted small'}>
                {u.seen ? '✓ הגן ראה' : formatTime(u.createdAt)}
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
