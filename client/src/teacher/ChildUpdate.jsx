import { useState } from 'react';
import {
  FOOD,
  MOOD,
  POOP,
  SUPPLIES,
  activityIcon,
  childStatus,
  foodLabel,
  formatDayShort,
  g,
  parentUpdateText,
  statusLabel,
} from '../shared/copy.js';
import { Avatar, Chip, Icon, SectionHead, Segmented, StatusPill, TopBar, toast } from '../shared/ui.jsx';
import SleepEditor from './SleepEditor.jsx';

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const sleepValue = (s) => (!s ? null : s.status === 'none' ? { status: 'none' } : { status: 'slept', start: s.start, end: s.end });

/** עדכון יומי לילד/ה — everything about one child's day, saved with one button. */
export default function ChildUpdate({ child, date, day, place, nextChild, onBack, onSave, onSeen, onOpen, onDefineActivities }) {
  const { report } = child;
  const gd = child.gender;
  const todaysSupply = child.supplies.find((s) => s.date === date);

  const initial = {
    absent: report.absent,
    mood: report.mood,
    food: report.food,
    activities: report.activities ?? day.activities,
    highlight: report.highlight ?? '',
    note: report.note ?? '',
    sleep: sleepValue(report.sleep),
    poop: report.poop,
  };
  const [draft, setDraft] = useState(initial);
  const [supplies, setSupplies] = useState({ items: todaysSupply?.items ?? [], otherText: todaysSupply?.otherText ?? '' });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  function changes() {
    const fields = {};
    for (const key of ['absent', 'mood', 'food', 'poop']) if (draft[key] !== initial[key]) fields[key] = draft[key];
    for (const key of ['highlight', 'note']) if (draft[key].trim() !== initial[key]) fields[key] = draft[key].trim() || null;
    if (JSON.stringify(draft.sleep) !== JSON.stringify(initial.sleep)) fields.sleep = draft.sleep;
    if (!sameSet(draft.activities, initial.activities)) {
      // Joining everything is stored as null, so the child follows later changes to the class's activities.
      fields.activities = sameSet(draft.activities, day.activities) ? null : draft.activities;
    }
    const before = { items: todaysSupply?.items ?? [], otherText: todaysSupply?.otherText ?? '' };
    const suppliesChanged = !sameSet(supplies.items, before.items) || supplies.otherText.trim() !== before.otherText;
    return { fields, supplies: suppliesChanged ? { items: supplies.items, otherText: supplies.otherText.trim() || null } : null };
  }

  async function save(goNext) {
    const { fields, supplies: supplyChange } = changes();
    setBusy(true);
    const ok = await onSave(child.id, fields, supplyChange);
    setBusy(false);
    if (!ok) return;
    if (Object.keys(fields).length || supplyChange) toast(`העדכון של ${child.name} נשמר ✨`);
    goNext && nextChild ? onOpen(nextChild.id) : onBack();
  }

  const status = childStatus({ ...report, absent: draft.absent, complete: Boolean(draft.food && draft.mood) });
  const toggleActivity = (a) =>
    set({ activities: draft.activities.includes(a) ? draft.activities.filter((x) => x !== a) : [...draft.activities, a] });
  const toggleSupply = (v) =>
    setSupplies((s) => ({ ...s, items: s.items.includes(v) ? s.items.filter((i) => i !== v) : [...s.items, v] }));
  const olderOpen = child.supplies.filter((s) => s.date !== date && s.status === 'open');

  return (
    <>
      <TopBar place={place} title="עדכון יומי" onBack={onBack} />
      <main className="main main-plain with-savebar">
        <section className="card child-head">
          <Avatar name={child.name} size="lg" />
          <div className="child-head-text">
            <h2>{child.name} <span aria-hidden="true">🌸</span></h2>
            <p className="muted small">{place}</p>
          </div>
          <StatusPill status={status}>{statusLabel(status, gd)}</StatusPill>
        </section>

        {child.parentUpdates.map((u) => (
          <section key={u.id} className={`card note-card${u.seen ? ' is-seen' : ''}`}>
            <div>
              <p><strong>💌 מההורים:</strong> {parentUpdateText(u, gd)}</p>
              {u.note && <p className="muted small">{u.note}</p>}
            </div>
            {u.seen ? <span className="seen">✓ נקרא</span> : (
              <button className="btn btn-small btn-soft" onClick={() => onSeen(u.id)}>ראיתי</button>
            )}
          </section>
        ))}

        <label className="card switch-card">
          <span className="strong">{g(gd, 'הגיע לגן היום', 'הגיעה לגן היום')}</span>
          <input type="checkbox" className="switch" checked={!draft.absent} onChange={(e) => set({ absent: !e.target.checked })} />
        </label>

        {!draft.absent && (
          <>
            <section className="block">
              <SectionHead emoji="😊" tone="butter" title={`איך עבר על ${child.name} היום?`} />
              <div className="mood-grid" role="radiogroup" aria-label="מצב רוח">
                {MOOD.map((m) => (
                  <button key={m.value} role="radio" aria-checked={draft.mood === m.value}
                    className={`mood-card${draft.mood === m.value ? ' is-on' : ''}`}
                    onClick={() => set({ mood: draft.mood === m.value ? null : m.value })}>
                    <span className="mood-emoji" aria-hidden="true">{m.emoji}</span>
                    <span>{m.label}</span>
                    {draft.mood === m.value && <span className="mood-check"><Icon name="check" size={16} /></span>}
                  </button>
                ))}
              </div>
            </section>

            <section className="card">
              <SectionHead emoji="🍎" tone="peach" title={`איך ${child.name} ${g(gd, 'אכל', 'אכלה')}?`} />
              <div className="choice-row" role="radiogroup" aria-label="ארוחות">
                {FOOD.map((f) => (
                  <button key={f.value} role="radio" aria-checked={draft.food === f.value}
                    className={`choice${draft.food === f.value ? ' is-on' : ''}`}
                    onClick={() => set({ food: draft.food === f.value ? null : f.value })}>
                    {foodLabel(f.value, gd)} <span aria-hidden="true">{f.emoji}</span>
                  </button>
                ))}
              </div>
              <p className="muted small hint-line">התפריט עצמו מתעדכן פעם אחת לכל הגן</p>
            </section>

            <section className="block">
              <SectionHead emoji="🎨" tone="sky" title={`במה ${g(gd, 'השתתף', 'השתתפה')} היום?`}
                aside={day.activities.length > 0 && <span className="muted small">אפשר לבחור כמה</span>} />
              {day.activities.length ? (
                <div className="chips">
                  {day.activities.map((a) => (
                    <Chip key={a} on={draft.activities.includes(a)} onClick={() => toggleActivity(a)}>
                      {a} <span aria-hidden="true">{activityIcon(a)}</span>
                    </Chip>
                  ))}
                </div>
              ) : (
                <button className="card card-link" onClick={onDefineActivities}>
                  <span>עוד לא הוגדרו פעילויות להיום. <strong>הגדרה פעם אחת לכל הקבוצה</strong></span>
                  <Icon name="chevron" size={20} />
                </button>
              )}
            </section>

            <section className="card">
              <SectionHead emoji="🌟" tone="lilac" title="משהו חדש שעשיתי" aside={<span className="muted small">לא חובה</span>} />
              <textarea className="input" rows={2} maxLength={280} value={draft.highlight}
                placeholder={`למשל: ${child.name} ${g(gd, 'ניסה', 'ניסתה')} היום לאכול לבד עם כפית`}
                onChange={(e) => set({ highlight: e.target.value })} aria-label="משהו חדש שעשיתי" />
            </section>

            <section className="card">
              <SectionHead emoji="💛" tone="butter" title="כדאי שתדעו" aside={<span className="muted small">לא חובה</span>} />
              <textarea className="input" rows={2} maxLength={280} value={draft.note}
                placeholder="משפט קצר שחשוב שההורים ידעו"
                onChange={(e) => set({ note: e.target.value })} aria-label="כדאי שתדעו" />
            </section>

            <section className="card">
              <SectionHead emoji="😴" tone="mint" title="מנוחה ויציאה" aside={<span className="muted small">לא חובה</span>} />
              <SleepEditor value={draft.sleep} gender={gd} onChange={(v) => set({ sleep: v })} />
              <div className="field-inline">
                <span className="strong small">יציאה</span>
                <Segmented label="יציאה" options={POOP} value={draft.poop} onChange={(v) => set({ poop: v })} />
              </div>
            </section>
          </>
        )}

        <section className="card">
          <SectionHead emoji="🎒" tone="peach" title="חסר בתיק" aside={<span className="muted small">לא חובה</span>} />
          <div className="chips">
            {SUPPLIES.map((s) => (
              <Chip key={s.value} on={supplies.items.includes(s.value)} onClick={() => toggleSupply(s.value)}>{s.label}</Chip>
            ))}
          </div>
          {supplies.items.includes('other') && (
            <input className="input input-gap" placeholder="מה חסר?" maxLength={60} value={supplies.otherText}
              onChange={(e) => setSupplies((s) => ({ ...s, otherText: e.target.value }))} />
          )}
          {todaysSupply?.status === 'done' && <p className="seen">✓ ההורים סימנו: טופל</p>}
          {olderOpen.map((s) => <p className="muted small" key={s.id}>עדיין פתוח מ{formatDayShort(s.date)}</p>)}
        </section>
      </main>

      <div className="savebar">
        <button className="btn btn-primary btn-block btn-big" disabled={busy} onClick={() => save(false)}>
          שמירת העדכון ל{child.name} <span aria-hidden="true">💛</span>
        </button>
        {nextChild && (
          <button className="link-btn" disabled={busy} onClick={() => save(true)}>
            שמירה ומעבר ל{nextChild.name} ←
          </button>
        )}
      </div>
    </>
  );
}
