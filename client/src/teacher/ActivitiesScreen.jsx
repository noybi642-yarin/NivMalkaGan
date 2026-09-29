import { useState } from 'react';
import { ACTIVITY_PRESETS, activityIcon, formatDay } from '../shared/copy.js';
import { Chip, Credit, SectionHead, TopBar } from '../shared/ui.jsx';

/** פעילויות וחוגים — defined once per group; each child's update then just ticks which ones they joined. */
export default function ActivitiesScreen({ data, place, classSwitcher, onSave, onBack }) {
  const { activities } = data.day;
  const [custom, setCustom] = useState('');
  const options = [...new Set([...ACTIVITY_PRESETS, ...activities])];

  const toggle = (a) => onSave(activities.includes(a) ? activities.filter((x) => x !== a) : [...activities, a]);

  function addCustom(e) {
    e.preventDefault();
    const a = custom.trim();
    if (a && !activities.includes(a)) onSave([...activities, a]);
    setCustom('');
  }

  return (
    <>
      <TopBar place={place} title="פעילויות וחוגים" onBack={onBack} />
      <main className="main main-plain">
        <section className="hello">
          <h1>מה עשינו היום? <span aria-hidden="true">🎨</span></h1>
          <p className="muted">{formatDay(data.date)} · פעם אחת לכל הקבוצה</p>
        </section>
        {classSwitcher}
        <section className="card">
          <SectionHead emoji="🎵" tone="sky" title={`הפעילויות של ${data.class.name}`}
            aside={<span className="muted small">נשמר אוטומטית</span>} />
          <div className="chips">
            {options.map((a) => (
              <Chip key={a} on={activities.includes(a)} onClick={() => toggle(a)}>
                {a} <span aria-hidden="true">{activityIcon(a)}</span>
              </Chip>
            ))}
          </div>
          <form className="inline-form" onSubmit={addCustom}>
            <input className="input" placeholder="פעילות או חוג אחר…" maxLength={40} value={custom}
              onChange={(e) => setCustom(e.target.value)} />
            <button className="btn btn-soft" disabled={!custom.trim()}>הוספה</button>
          </form>
        </section>
        <p className="page-pad muted small">
          כל הילדים משויכים לפעילויות האלה. מי שלא השתתף/ה — מורידים בעדכון האישי שלו/ה.
        </p>
        <div className="page-pad">
          <button className="btn btn-primary btn-block" onClick={onBack}>סיום</button>
        </div>
        <Credit />
      </main>
    </>
  );
}
