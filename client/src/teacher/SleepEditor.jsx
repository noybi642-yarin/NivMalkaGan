import { useEffect, useState } from 'react';
import { Chip } from '../shared/ui.jsx';
import { formatDuration, g } from '../shared/copy.js';

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

/** Start/end time inputs with automatic duration. Emits a sleep value only when it is valid. */
export default function SleepEditor({ value, gender, onChange, defaults = { start: '12:30', end: '14:30' } }) {
  const [start, setStart] = useState(value?.start ?? defaults.start);
  const [end, setEnd] = useState(value?.end ?? defaults.end);

  useEffect(() => {
    if (value?.status === 'slept') {
      setStart(value.start);
      setEnd(value.end);
    }
  }, [value?.status, value?.start, value?.end]);

  const valid = start && end && toMin(end) > toMin(start);
  const none = value?.status === 'none';

  function commit(s, e) {
    if (s && e && toMin(e) > toMin(s)) onChange({ status: 'slept', start: s, end: e });
  }

  return (
    <div className="sleep-editor">
      <div className={`time-range${none ? ' is-muted' : ''}`}>
        <label>
          <span>נרדמ{g(gender, '', 'ה')}</span>
          <input className="input input-time" type="time" step="300" value={start}
            onChange={(e) => { setStart(e.target.value); commit(e.target.value, end); }} />
        </label>
        <label>
          <span>התעורר{g(gender, '', 'ה')}</span>
          <input className="input input-time" type="time" step="300" value={end}
            onChange={(e) => { setEnd(e.target.value); commit(start, e.target.value); }} />
        </label>
        <div className="duration" aria-live="polite">
          {none ? '—' : valid ? formatDuration(toMin(end) - toMin(start)) : 'שעה לא תקינה'}
        </div>
      </div>
      <div className="sleep-actions">
        {!value && valid && (
          <button className="btn btn-soft" onClick={() => commit(start, end)}>סימון שעות השינה</button>
        )}
        <Chip on={none} onClick={() => onChange(none ? null : { status: 'none' })}>
          {g(gender, 'לא ישן', 'לא ישנה')}
        </Chip>
      </div>
    </div>
  );
}
