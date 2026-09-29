import { useState } from 'react';
import {
  FOOD,
  HIGHLIGHT_SUGGESTIONS,
  MENU_MEALS,
  MOOD,
  POOP,
  SLEEP,
  SLEEP_DURATIONS,
  SUPPLIES,
  SUPPLY_TITLE,
  activityIcon,
  childStatus,
  formatDayShort,
  formatDuration,
  g,
  noteTemplates,
  parentUpdateText,
  statusLabel,
} from '../shared/copy.js';
import { Avatar, Chip, Credit, Icon, SectionHead, Segmented, StatusPill, TopBar, toast } from '../shared/ui.jsx';

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const SIMPLE_FIELDS = ['absent', 'mood', 'food_breakfast', 'food_lunch', 'food_snack', 'sleep_quality', 'sleep_minutes', 'poop'];

/** Adds a phrase to free text, or removes it if it is already there (so suggestion chips toggle). */
function togglePhrase(text, phrase) {
  const parts = text.split(/\s*[,،·]\s*|\n/).map((p) => p.trim()).filter(Boolean);
  const next = parts.includes(phrase) ? parts.filter((p) => p !== phrase) : [...parts, phrase];
  return next.join(', ');
}

/**
 * עדכון יומי לילד/ה — built for tap → tap → tap → save.
 * Everything is a ready-made option; free text is always there but never required.
 */
export default function ChildUpdate({ child, date, day, menu, place, nextChild, onBack, onSave, onSeen, onOpen, onDefineActivities }) {
  const { report } = child;
  const gd = child.gender;
  const todaysSupply = child.supplies.find((s) => s.date === date);
  // Only the meals on today's menu; all three when the menu has not been entered yet.
  const menuMeals = MENU_MEALS.filter((m) => menu?.[m.key]);
  const meals = menuMeals.length ? menuMeals : MENU_MEALS;

  const initial = {
    absent: report.absent,
    mood: report.mood,
    food_breakfast: report.food_breakfast,
    food_lunch: report.food_lunch,
    food_snack: report.food_snack,
    sleep_quality: report.sleep_quality,
    sleep_minutes: report.sleep_minutes,
    poop: report.poop,
    activities: report.activities ?? day.activities,
    highlight: report.highlight ?? '',
    note: report.note ?? '',
  };
  const [draft, setDraft] = useState(initial);
  const [supplies, setSupplies] = useState({ items: todaysSupply?.items ?? [], otherText: todaysSupply?.otherText ?? '' });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const pick = (key, value) => set({ [key]: draft[key] === value ? null : value });

  function changes() {
    const fields = {};
    for (const key of SIMPLE_FIELDS) if (draft[key] !== initial[key]) fields[key] = draft[key];
    for (const key of ['highlight', 'note']) if (draft[key].trim() !== initial[key]) fields[key] = draft[key].trim() || null;
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

  const ateSomething = meals.some((m) => draft[`food_${m.key}`]);
  const status = childStatus({ ...report, absent: draft.absent, complete: Boolean(draft.mood && ateSomething) });
  const allMealsWell = meals.every((m) => draft[`food_${m.key}`] === 'well');
  const toggleActivity = (a) =>
    set({ activities: draft.activities.includes(a) ? draft.activities.filter((x) => x !== a) : [...draft.activities, a] });
  const toggleSupply = (v) =>
    setSupplies((s) => ({ ...s, items: s.items.includes(v) ? s.items.filter((i) => i !== v) : [...s.items, v] }));
  const olderOpen = child.supplies.filter((s) => s.date !== date && s.status === 'open');
  const optional = <span className="muted small">לא חובה</span>;

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
              <SectionHead emoji="😊" tone="butter" title="איך עבר עליי היום?" />
              <div className="mood-grid" role="radiogroup" aria-label="איך עבר היום">
                {MOOD.map((m) => (
                  <button key={m.value} role="radio" aria-checked={draft.mood === m.value}
                    className={`mood-card${draft.mood === m.value ? ' is-on' : ''}`} onClick={() => pick('mood', m.value)}>
                    <span className="mood-emoji" aria-hidden="true">{m.emoji}</span>
                    <span>{m.label(gd)}</span>
                    {draft.mood === m.value && <span className="mood-check"><Icon name="check" size={16} /></span>}
                  </button>
                ))}
              </div>
            </section>

            <section className="card">
              <SectionHead emoji="🍎" tone="peach" title="ארוחות" aside={!allMealsWell && (
                <button className="link-btn small"
                  onClick={() => set(Object.fromEntries(meals.map((m) => [`food_${m.key}`, 'well'])))}>
                  {FOOD[0].label(gd)} בכולן
                </button>
              )} />
              {meals.map((m) => {
                const key = `food_${m.key}`;
                return (
                  <div className="meal-row" key={m.key}>
                    <p className="meal-row-title">
                      <span>{m.emoji} {m.label}</span>
                      {menu?.[m.key] && <span className="muted small">{menu[m.key]}</span>}
                    </p>
                    <div className="choice-grid" role="radiogroup" aria-label={m.label}>
                      {FOOD.map((f) => (
                        <button key={f.value} role="radio" aria-checked={draft[key] === f.value}
                          className={`choice${draft[key] === f.value ? ' is-on' : ''}`} onClick={() => pick(key, f.value)}>
                          {f.label(gd)} <span aria-hidden="true">{f.emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="muted small hint-line">התפריט עצמו מתעדכן פעם אחת לכל הגן</p>
            </section>

            <section className="card">
              <SectionHead emoji="😴" tone="mint" title="שינה ומנוחה" aside={optional} />
              <div className="choice-grid" role="radiogroup" aria-label="שינה">
                {SLEEP.map((s) => (
                  <button key={s.value} role="radio" aria-checked={draft.sleep_quality === s.value}
                    className={`choice${draft.sleep_quality === s.value ? ' is-on' : ''}`}
                    onClick={() => set({ sleep_quality: draft.sleep_quality === s.value ? null : s.value, ...(s.value === 'none' ? { sleep_minutes: null } : {}) })}>
                    {s.label(gd)} <span aria-hidden="true">{s.emoji}</span>
                  </button>
                ))}
              </div>
              {draft.sleep_quality && draft.sleep_quality !== 'none' && (
                <div className="duration-row">
                  <span className="strong small">כמה זמן?</span>
                  <div className="chips">
                    {SLEEP_DURATIONS.map((min) => (
                      <Chip key={min} on={draft.sleep_minutes === min} onClick={() => pick('sleep_minutes', min)}>
                        {formatDuration(min)}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <div className="field-inline">
                <span className="strong small">יציאה</span>
                <Segmented label="יציאה" options={POOP} value={draft.poop} onChange={(v) => set({ poop: v })} />
              </div>
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
              <SectionHead emoji="🌟" tone="lilac" title="משהו חדש שעשיתי" aside={optional} />
              <div className="chips chips-tight">
                {HIGHLIGHT_SUGGESTIONS.map((sug) => (
                  <Chip key={sug.text} on={draft.highlight.includes(sug.text)}
                    onClick={() => set({ highlight: togglePhrase(draft.highlight, sug.text) })}>
                    {sug.text} <span aria-hidden="true">{sug.emoji}</span>
                  </Chip>
                ))}
              </div>
              <textarea className="input input-gap" rows={2} maxLength={280} value={draft.highlight}
                placeholder="או לכתוב משהו משלך…" onChange={(e) => set({ highlight: e.target.value })} aria-label="משהו חדש שעשיתי" />
            </section>

            <section className="card">
              <SectionHead emoji="💛" tone="butter" title="כדאי שתדעו" aside={optional} />
              <div className="chips chips-tight">
                {noteTemplates(gd).map((phrase) => (
                  <Chip key={phrase} on={draft.note.includes(phrase)}
                    onClick={() => set({ note: togglePhrase(draft.note, phrase) })}>
                    {phrase}
                  </Chip>
                ))}
              </div>
              <textarea className="input input-gap" rows={2} maxLength={280} value={draft.note}
                placeholder="אפשר לבחור משפט ולערוך, או לכתוב חופשי" onChange={(e) => set({ note: e.target.value })} aria-label="כדאי שתדעו" />
            </section>
          </>
        )}

        <section className="card supply-card">
          <SectionHead emoji="🎒" tone="peach" title={SUPPLY_TITLE} aside={optional} />
          <div className="chips">
            {SUPPLIES.map((s) => (
              <Chip key={s.value} on={supplies.items.includes(s.value)} onClick={() => toggleSupply(s.value)}>
                {s.label} <span aria-hidden="true">{s.emoji}</span>
              </Chip>
            ))}
          </div>
          {supplies.items.includes('other') && (
            <input className="input input-gap" placeholder="מה עוד חסר?" maxLength={60} value={supplies.otherText} autoFocus
              onChange={(e) => setSupplies((s) => ({ ...s, otherText: e.target.value }))} aria-label="פריט אחר" />
          )}
          {todaysSupply?.status === 'done' && <p className="seen hint-line">✓ ההורים סימנו: טופל</p>}
          {olderOpen.map((s) => <p className="muted small" key={s.id}>עדיין פתוח מ{formatDayShort(s.date)}</p>)}
        </section>
        <Credit />
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
