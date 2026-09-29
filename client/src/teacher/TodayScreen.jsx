import { useState } from 'react';
import { FIELDS, MENU_MEALS, SLEEP_DURATIONS, formatDuration } from '../shared/copy.js';
import { Icon, Segmented, TopBar } from '../shared/ui.jsx';

/** Row buttons are compact: short word only, emoji stays on the group buttons. */
const rowOptions = (options) => options.map(({ value, short }) => ({ value, short }));

/** עדכון מהיר לקבוצה: one field at a time for the whole group, then the exceptions. */
export default function TodayScreen({ data, place, applyField, patchChild, onOpenChild, onBack, classSwitcher }) {
  const [fieldKey, setFieldKey] = useState('food');
  const menuMeals = MENU_MEALS.filter((m) => data.menu?.[m.key]);
  const meals = menuMeals.length ? menuMeals : MENU_MEALS;
  const [meal, setMeal] = useState(meals.find((m) => m.key === 'lunch')?.key ?? meals[0].key);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const field = FIELDS.find((f) => f.key === fieldKey);
  // Eating is recorded per meal; the tab works on the meal picked below it.
  const reportKey = fieldKey === 'food' ? `food_${meal}` : fieldKey;
  const present = data.children.filter((c) => !c.report.absent);
  const absent = data.children.filter((c) => c.report.absent);
  const complete = present.filter((c) => c.report.complete).length;
  const unset = present.filter((c) => c.report[reportKey] == null);

  // Smart default target: whoever isn't set yet, so batching never overwrites an exception.
  let targets;
  let targetLabel;
  if (selecting) {
    targets = present.filter((c) => selected.has(c.id));
    targetLabel = targets.length ? `ל-${targets.length} שנבחרו` : 'בחרו ילדים מהרשימה';
  } else if (unset.length && unset.length < present.length) {
    targets = unset;
    targetLabel = `לכל מי שטרם סומן (${unset.length})`;
  } else {
    targets = present;
    targetLabel = `לכולם (${present.length})`;
  }
  // Sleep duration goes to whoever slept (within the selection, if there is one) — and, like the other
  // group buttons, first to those without a duration yet, so it never overwrites an exception.
  const slept = (selecting ? targets : present).filter((c) => c.report.sleep_quality && c.report.sleep_quality !== 'none');
  const noDuration = slept.filter((c) => !c.report.sleep_minutes);
  const sleepers = !selecting && noDuration.length ? noDuration : slept;

  function batch(key, value, list = targets) {
    if (!list.length) return;
    applyField(key, list.map((c) => ({ childId: c.id, value })));
    setSelecting(false);
    setSelected(new Set());
  }

  function toggleSelected(id) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const tabDone = (f) => {
    const key = f.key === 'food' ? `food_${meal}` : f.key;
    return present.filter((c) => c.report[key] != null).length;
  };
  const allDone = present.length > 0 && complete === present.length;

  return (
    <>
      <TopBar place={place} title="עדכון מהיר לקבוצה" onBack={onBack} />
      {classSwitcher}
      <p className="page-pad muted">
        {data.class.name} · {present.length - complete ? `${present.length - complete} ממתינים לעדכון` : 'כולם עודכנו'}
      </p>

      {allDone && (
        <section className="card card-done">
          <span className="done-icon"><Icon name="check" /></span>
          <div>
            <strong>כל הילדים עודכנו</strong>
            <p className="muted">ההורים כבר רואים את היום. אפשר להוסיף "משהו חדש שעשיתי" בעדכון האישי של כל ילד/ה.</p>
          </div>
        </section>
      )}

      <div className="sticky-controls">
        <div className="field-tabs" role="tablist" aria-label="מה מעדכנים">
          {FIELDS.map((f) => {
            const done = tabDone(f);
            return (
              <button key={f.key} role="tab" aria-selected={f.key === fieldKey}
                className={`field-tab${f.key === fieldKey ? ' is-active' : ''}${done === present.length ? ' is-done' : ''}`}
                onClick={() => { setFieldKey(f.key); setSelecting(false); setSelected(new Set()); }}>
                <span className="field-icon" aria-hidden="true">{f.icon}</span>
                <span>{f.label}</span>
                <small>{done === present.length ? '✓' : `${done}/${present.length}`}</small>
              </button>
            );
          })}
        </div>

        <div className="batch">
          {fieldKey === 'food' && meals.length > 1 && (
            <div className="meal-picker" role="tablist" aria-label="איזו ארוחה">
              {meals.map((m) => (
                <button key={m.key} role="tab" aria-selected={m.key === meal} className={m.key === meal ? 'is-on' : ''}
                  onClick={() => setMeal(m.key)}>
                  {m.emoji} {m.label.replace('ארוחת ', '')}
                </button>
              ))}
            </div>
          )}
          <div className="batch-head">
            <span className="batch-target">{targetLabel}</span>
            <button className="link-btn" onClick={() => { setSelecting((s) => !s); setSelected(new Set()); }}>
              {selecting ? 'ביטול בחירה' : 'בחירה'}
            </button>
          </div>
          <div className={`batch-actions n${field.options.length}`}>
            {field.options.map((o) => (
              <button key={o.value} className="btn btn-batch" disabled={!targets.length} onClick={() => batch(reportKey, o.value)}>
                {o.emoji && <span aria-hidden="true">{o.emoji} </span>}{o.batch}
              </button>
            ))}
          </div>
          {fieldKey === 'sleep_quality' && (
            <div className="batch-duration">
              <span className="batch-target">
                כמה זמן ישנו? {!selecting && noDuration.length && noDuration.length < slept.length ? `(למי שטרם סומן: ${sleepers.length})` : `(${sleepers.length})`}
              </span>
              <div className="chips">
                {SLEEP_DURATIONS.map((min) => (
                  <button key={min} className="chip" disabled={!sleepers.length} onClick={() => batch('sleep_minutes', min, sleepers)}>
                    {formatDuration(min)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ul className="rows" aria-label={field.title || field.label}>
        {present.map((c) => (
          <li key={c.id} className={`row${selecting && selected.has(c.id) ? ' is-selected' : ''}`}>
            {selecting ? (
              <button className="row-select" onClick={() => toggleSelected(c.id)} aria-pressed={selected.has(c.id)}>
                <span className="checkbox">{selected.has(c.id) && <Icon name="check" size={16} />}</span>
                <span className="row-name">{c.name}</span>
              </button>
            ) : (
              <>
                <button className="row-name-btn" onClick={() => onOpenChild(c.id)}>
                  <span className={`status-dot${c.report.complete ? ' is-complete' : ''}`} />
                  <span className="row-name">
                    {c.name}
                    {fieldKey === 'sleep_quality' && c.report.sleep_minutes && c.report.sleep_quality !== 'none' && (
                      <small className="row-sub">{formatDuration(c.report.sleep_minutes)}</small>
                    )}
                  </span>
                  {c.parentUpdates.some((u) => !u.seen) && <span className="row-flag" title="הודעה מההורים">✉️</span>}
                </button>
                <Segmented size="row" label={`${field.label} — ${c.name}`} options={rowOptions(field.options)}
                  value={c.report[reportKey]} onChange={(v) => patchChild(c.id, { [reportKey]: v })} />
              </>
            )}
          </li>
        ))}
      </ul>

      {absent.length > 0 && (
        <section className="absent">
          <span className="muted">לא הגיעו היום:</span>
          {absent.map((c) => (
            <button key={c.id} className="chip chip-quiet" onClick={() => onOpenChild(c.id)}>{c.name}</button>
          ))}
        </section>
      )}
      <p className="hint">לחיצה על שם פותחת את העדכון האישי — שם גם מסמנים מי לא הגיע/ה</p>
    </>
  );
}
