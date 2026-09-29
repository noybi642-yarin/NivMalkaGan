import { useState } from 'react';
import { useLoad } from '../shared/api.js';
import { MOOD, childWord, foodSentence, formatDayShort, sleepSentence } from '../shared/copy.js';
import { Loading, PageHeader } from '../shared/ui.jsx';
import DaySummary, { absentText } from './DaySummary.jsx';

export default function MyChild({ child, logoutButton, switcher }) {
  const { data } = useLoad(`/parent/children/${child.id}/history`);
  const [openDate, setOpenDate] = useState(null);

  return (
    <>
      <PageHeader title={childWord(child.gender)} action={logoutButton} />
      {switcher && <div className="page-pad">{switcher}</div>}

      <section className="card child-profile">
        <div className="avatar" aria-hidden="true">{child.name[0]}</div>
        <div>
          <h2>{child.name}</h2>
          <p className="muted">{child.className} · {child.kindergartenName}</p>
        </div>
      </section>

      <h2 className="section-title">הימים האחרונים</h2>
      {!data ? <Loading /> : data.days.length === 0 ? (
        <p className="page-pad muted">עוד אין ימים קודמים להצגה.</p>
      ) : (
        <ul className="history">
          {data.days.map(({ date, report, day }) => {
            const mood = MOOD.find((m) => m.value === report.mood);
            const open = openDate === date;
            const line = report.absent
              ? absentText(child)
              : [report.food && foodSentence(report.food, child.gender), report.sleep && sleepSentence(report.sleep, child.gender)]
                .filter(Boolean).join(' · ');
            return (
              <li key={date} className="card history-day">
                <button className="history-head" aria-expanded={open} onClick={() => setOpenDate(open ? null : date)}>
                  <span className="history-emoji" aria-hidden="true">{mood?.emoji ?? '·'}</span>
                  <span>
                    <strong>{formatDayShort(date)}</strong>
                    <span className="muted small history-line">{line}</span>
                  </span>
                </button>
                {open && !report.absent && (
                  <div className="history-body">
                    <DaySummary child={child} report={report} day={day} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
