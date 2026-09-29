import { useState } from 'react';
import { FIELDS, formatDay, parentUpdateText, sleepShort } from '../shared/copy.js';
import { Icon, PageHeader, Progress, Segmented, Sheet } from '../shared/ui.jsx';
import SleepEditor from './SleepEditor.jsx';

/** Most common sleep window already entered today — the smart default for the batch. */
function commonSleep(children) {
  const counts = new Map();
  for (const c of children) {
    const s = c.report.sleep;
    if (s?.status === 'slept') counts.set(`${s.start}|${s.end}`, (counts.get(`${s.start}|${s.end}`) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return { start: '12:30', end: '14:30' };
  const [start, end] = top[0].split('|');
  return { start, end };
}

export default function TodayScreen({ data, applyField, patchChild, markSeen, onOpenChild, logoutButton, onClass, classId }) {
  const [fieldKey, setFieldKey] = useState('food');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [sleepChildId, setSleepChildId] = useState(null);
  const [batchSleep, setBatchSleep] = useState(null);

  const field = FIELDS.find((f) => f.key === fieldKey);
  const present = data.children.filter((c) => !c.report.absent);
  const absent = data.children.filter((c) => c.report.absent);
  const complete = present.filter((c) => c.report.complete).length;
  const unset = present.filter((c) => c.report[fieldKey] == null);
  const sleepDefaults = commonSleep(present);

  const unseen = data.children.flatMap((c) => c.parentUpdates.filter((u) => !u.seen).map((u) => ({ ...u, child: c })));

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

  function batch(value) {
    if (!targets.length) return;
    applyField(fieldKey, targets.map((c) => ({ childId: c.id, value })));
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

  const sleepChild = data.children.find((c) => c.id === sleepChildId);
  const allDone = present.length > 0 && complete === present.length;

  return (
    <>
      <PageHeader
        eyebrow={
          data.classes.length > 1 ? (
            <select className="class-select" value={classId} onChange={(e) => onClass(Number(e.target.value))}
              aria-label="כיתה">
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : data.class.name
        }
        title={formatDay(data.date)}
        subtitle={`${complete} מתוך ${present.length} עודכנו`}
        action={logoutButton}
      />
      <div className="page-pad">
        <Progress value={complete} total={present.length} />
      </div>

      {unseen.length > 0 && (
        <section className="card card-warm parent-notes" aria-label="הודעות מההורים">
          <h2 className="card-title">הודעות מההורים הבוקר</h2>
          {unseen.map((u) => (
            <div className="parent-note" key={u.id}>
              <div>
                <strong>{u.child.name}</strong> · {parentUpdateText(u, u.child.gender)}
                {u.note && <p className="muted">{u.note}</p>}
              </div>
              <button className="btn btn-small" onClick={() => markSeen(u.id)}>ראיתי</button>
            </div>
          ))}
        </section>
      )}

      {allDone && (
        <section className="card card-done">
          <span className="done-icon"><Icon name="check" /></span>
          <div>
            <strong>כל הילדים עודכנו</strong>
            <p className="muted">ההורים כבר רואים את היום. אפשר להוסיף רגע קטן בלשונית הילדים.</p>
          </div>
        </section>
      )}

      <div className="sticky-controls">
        <div className="field-tabs" role="tablist" aria-label="מה מעדכנים">
          {FIELDS.map((f) => {
            const done = present.filter((c) => c.report[f.key] != null).length;
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
          <div className="batch-head">
            <span className="batch-target">{targetLabel}</span>
            <button className="link-btn" onClick={() => { setSelecting((s) => !s); setSelected(new Set()); }}>
              {selecting ? 'ביטול בחירה' : 'בחירה'}
            </button>
          </div>
          {fieldKey === 'sleep' ? (
            <BatchSleep value={batchSleep ?? sleepDefaults} onChange={setBatchSleep}
              disabled={!targets.length} onApply={(v) => batch({ status: 'slept', ...v })} />
          ) : (
            <div className={`batch-actions n${field.options.length}`}>
              {field.options.map((o) => (
                <button key={o.value} className="btn btn-batch" disabled={!targets.length} onClick={() => batch(o.value)}>
                  {o.emoji && <span aria-hidden="true">{o.emoji} </span>}{o.batch}
                </button>
              ))}
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
                  <span className="row-name">{c.name}</span>
                  {c.parentUpdates.some((u) => !u.seen) && <span className="row-flag" title="הודעה מההורים">✉️</span>}
                </button>
                {fieldKey === 'sleep' ? (
                  <button className={`sleep-cell${c.report.sleep ? ' is-set' : ''}`} onClick={() => setSleepChildId(c.id)}>
                    {sleepShort(c.report.sleep, c.gender) ?? 'הוספת שעות'}
                  </button>
                ) : (
                  <Segmented size="row" label={`${field.label} — ${c.name}`} options={field.options}
                    value={c.report[fieldKey]} onChange={(v) => patchChild(c.id, { [fieldKey]: v })} />
                )}
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
      <p className="hint">כדי לסמן ילד/ה שלא הגיע/ה — לוחצים על השם</p>

      <Sheet open={Boolean(sleepChild)} onClose={() => setSleepChildId(null)} label="שינה">
        {sleepChild && (
          <>
            <h2 className="sheet-title">השינה של {sleepChild.name}</h2>
            <SleepEditor key={sleepChild.id} value={sleepChild.report.sleep} gender={sleepChild.gender}
              defaults={sleepDefaults} onChange={(v) => patchChild(sleepChild.id, { sleep: v })} />
            <button className="btn btn-primary btn-block" onClick={() => setSleepChildId(null)}>סיום</button>
          </>
        )}
      </Sheet>
    </>
  );
}

function BatchSleep({ value, onChange, onApply, disabled }) {
  const valid = value.start && value.end && value.end > value.start;
  return (
    <div className="batch-sleep">
      <input className="input input-time" type="time" step="300" aria-label="נרדמו" value={value.start}
        onChange={(e) => onChange({ ...value, start: e.target.value })} />
      <span className="muted">עד</span>
      <input className="input input-time" type="time" step="300" aria-label="התעוררו" value={value.end}
        onChange={(e) => onChange({ ...value, end: e.target.value })} />
      <button className="btn btn-batch" disabled={disabled || !valid} onClick={() => onApply(value)}>ישנו</button>
    </div>
  );
}

