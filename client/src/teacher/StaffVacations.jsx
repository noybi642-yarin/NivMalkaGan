import { useState } from 'react';
import { api, useLoad } from '../shared/api.js';
import { ErrorState, Icon, Loading, TopBar, Segmented, Sheet, toast } from '../shared/ui.jsx';
import VacationList from '../shared/VacationList.jsx';

const TYPES = [
  { value: 'holiday', short: 'חג / חופשה' },
  { value: 'staff_day', short: 'יום צוות' },
  { value: 'short_day', short: 'יום מקוצר' },
];

const EMPTY = { name: '', type: 'holiday', startDate: '', endDate: '', returnDate: '', note: '' };

export default function StaffVacations({ place, logoutButton }) {
  const { data, setData, error, reload } = useLoad('/vacations');
  const [editing, setEditing] = useState(null); // vacation form values, or null
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (error) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;

  async function send(path, method, body, done) {
    try {
      setData(await api(path, { method, body }));
      toast(done);
      return true;
    } catch {
      toast('לא נשמר — בדקו שהתאריכים תקינים');
      return false;
    }
  }

  return (
    <>
      <TopBar place={place} title="לוח חופשות" action={logoutButton} />
      <section className="hello">
        <h1>{data.title} <span aria-hidden="true">☀️</span></h1>
        <p className="muted">{data.subtitle}</p>
      </section>
      <div className="page-pad vacation-actions">
        <button className="btn btn-soft" onClick={() => setEditing(EMPTY)}>
          <Icon name="plus" size={18} /> הוספת חופשה
        </button>
        <button className="link-btn" onClick={() => setSettingsOpen(true)}>שנת לימודים וקיץ</button>
      </div>

      <VacationList
        schedule={data}
        onEdit={(v) => setEditing({
          id: v.id, name: v.name, type: v.type, startDate: v.startDate, endDate: v.endDate,
          returnDate: v.returnDateIso ?? '', note: v.note ?? '',
        })}
      />

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} label="חופשה">
        {editing && (
          <VacationForm
            key={editing.id ?? 'new'}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={async (v) => {
              const ok = editing.id
                ? await send(`/staff/vacations/${editing.id}`, 'PUT', v, 'נשמר ✓')
                : await send('/staff/vacations', 'POST', v, 'נוסף ללוח ✓');
              if (ok) setEditing(null);
            }}
            onDelete={editing.id && (async () => {
              if (!window.confirm(`למחוק את "${editing.name}" מהלוח?`)) return;
              if (await send(`/staff/vacations/${editing.id}`, 'DELETE', undefined, 'נמחק')) setEditing(null);
            })}
          />
        )}
      </Sheet>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} label="שנת לימודים וקיץ">
        {settingsOpen && (
          <SettingsForm
            initial={{ schoolYear: data.schoolYear ?? '', summerStart: data.summer?.startDate ?? '' }}
            onCancel={() => setSettingsOpen(false)}
            onSave={async (v) => {
              if (await send('/staff/vacations/settings', 'PUT', v, 'נשמר ✓')) setSettingsOpen(false);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function VacationForm({ initial, onSave, onCancel, onDelete }) {
  const [v, setV] = useState(initial);
  const set = (patch) => setV((x) => ({ ...x, ...patch }));
  const short = v.type === 'short_day';
  const end = v.endDate || v.startDate;
  const valid =
    v.name.trim() && v.startDate && end >= v.startDate &&
    (short ? v.note.trim() : v.returnDate && v.returnDate > end);

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ ...v, endDate: end }); }}>
      <h2 className="sheet-title">{initial.id ? 'עריכת חופשה' : 'חופשה חדשה'}</h2>
      <label className="field">
        <span>שם החג / האירוע</span>
        <input className="input" value={v.name} maxLength={40} required onChange={(e) => set({ name: e.target.value })} />
      </label>
      <div className="field">
        <span>סוג</span>
        <Segmented label="סוג" options={TYPES} value={v.type} onChange={(type) => type && set({ type })} />
      </div>
      <div className="date-pair">
        <label className="field">
          <span>{short ? 'תאריך' : 'מתאריך'}</span>
          <input className="input" type="date" value={v.startDate} required
            onChange={(e) => set({ startDate: e.target.value, endDate: short ? e.target.value : v.endDate })} />
        </label>
        {!short && (
          <label className="field">
            <span>עד תאריך</span>
            <input className="input" type="date" value={v.endDate} min={v.startDate}
              onChange={(e) => set({ endDate: e.target.value })} />
          </label>
        )}
      </div>
      {short ? (
        <label className="field">
          <span>מה חשוב לדעת</span>
          <input className="input" value={v.note} maxLength={80} placeholder="הגן פתוח עד 12:00"
            onChange={(e) => set({ note: e.target.value })} />
        </label>
      ) : (
        <label className="field">
          <span>חזרה לגן</span>
          <input className="input" type="date" value={v.returnDate} min={end}
            onChange={(e) => set({ returnDate: e.target.value })} />
        </label>
      )}
      <p className="muted small field-hint">הימים בשבוע מחושבים אוטומטית מהתאריכים.</p>
      <button className="btn btn-primary btn-block" disabled={!valid}>שמירה</button>
      <div className="form-secondary">
        <button type="button" className="link-btn" onClick={onCancel}>ביטול</button>
        {onDelete && <button type="button" className="link-btn link-danger" onClick={onDelete}>מחיקה</button>}
      </div>
    </form>
  );
}

function SettingsForm({ initial, onSave, onCancel }) {
  const [v, setV] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
      <h2 className="sheet-title">שנת לימודים וקיץ</h2>
      <label className="field">
        <span>שנת לימודים</span>
        <input className="input" value={v.schoolYear} maxLength={20} placeholder="תשפ״ז"
          onChange={(e) => setV({ ...v, schoolYear: e.target.value })} />
      </label>
      <label className="field">
        <span>יציאה לחופשת קיץ</span>
        <input className="input" type="date" value={v.summerStart}
          onChange={(e) => setV({ ...v, summerStart: e.target.value })} />
      </label>
      <button className="btn btn-primary btn-block">שמירה</button>
      <div className="form-secondary">
        <button type="button" className="link-btn" onClick={onCancel}>ביטול</button>
      </div>
    </form>
  );
}
