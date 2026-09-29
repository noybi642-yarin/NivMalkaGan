import { useState } from 'react';
import { useLoad } from '../shared/api.js';
import { MOOD, childWord, foodLabel, formatDayShort } from '../shared/copy.js';
import { Avatar, Loading, SectionHead, TopBar } from '../shared/ui.jsx';
import DaySummary, { absentText } from './DaySummary.jsx';

export default function MyChild({ child, kindergarten, logoutButton, switcher }) {
  const { data } = useLoad(`/parent/children/${child.id}/history`);
  const [openDate, setOpenDate] = useState(null);

  return (
    <>
      <TopBar place={kindergarten?.name} title={childWord(child.gender)} action={logoutButton} />
      {switcher && <div className="page-pad">{switcher}</div>}

      <section className="card child-profile">
        <Avatar name={child.name} size="lg" />
        <div>
          <h2>{child.name}</h2>
          <p className="muted">{child.className} · {child.kindergartenName}</p>
        </div>
      </section>

      {kindergarten && (kindergarten.hours || kindergarten.phone) && (
        <section className="card gan-info">
          <SectionHead emoji="🏡" tone="mint" title={kindergarten.name} />
          {kindergarten.hours && <p><span className="muted">שעות פעילות: </span>{kindergarten.hours}</p>}
          {kindergarten.phone && (
            <p><span className="muted">טלפון: </span><a href={`tel:${kindergarten.phone.replace(/[^\d+]/g, '')}`} dir="ltr">{kindergarten.phone}</a></p>
          )}
        </section>
      )}

      <h2 className="section-title">הימים האחרונים</h2>
      {!data ? <Loading /> : data.days.length === 0 ? (
        <p className="page-pad muted">עוד אין ימים קודמים להצגה.</p>
      ) : (
        <ul className="history">
          {data.days.map(({ date, report, day, menu }) => {
            const mood = MOOD.find((m) => m.value === report.mood);
            const open = openDate === date;
            const line = report.absent
              ? absentText(child)
              : [report.food && foodLabel(report.food, child.gender), report.highlight && `🌟 ${report.highlight}`]
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
                    <DaySummary child={child} report={report} day={day} menu={menu} />
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
