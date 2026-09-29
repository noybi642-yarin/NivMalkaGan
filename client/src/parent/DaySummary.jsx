import {
  FOOD,
  MENU_MEALS,
  MOOD,
  activityIcon,
  childActivities,
  foodLabel,
  g,
  moodSentence,
  poopSentence,
  sleepSentence,
  timeRange,
} from '../shared/copy.js';
import { SectionHead } from '../shared/ui.jsx';

/**
 * The child's day, section by section: איך עבר היום · מה אכלתי · פעילויות · משהו חדש שעשיתי ·
 * כדאי שתדעו · מנוחה. A section with nothing to say is not shown.
 */
export default function DaySummary({ child, report, day, menu }) {
  const mood = MOOD.find((m) => m.value === report.mood);
  const meals = MENU_MEALS.filter((m) => menu?.[m.key]);
  const activities = childActivities(report, day);

  return (
    <>
      {mood && (
        <section className="card mood-summary">
          <span className="mood-summary-emoji" aria-hidden="true">{mood.emoji}</span>
          <div>
            <span className="eyebrow-label">איך עבר היום?</span>
            <h2>{moodSentence(report.mood, child.name)}</h2>
          </div>
        </section>
      )}

      {(report.food || meals.length > 0) && (
        <section className="card">
          <SectionHead emoji="🍎" tone="peach" title="מה אכלתי"
            aside={report.food && (
              <span className="pill pill-done">
                {foodLabel(report.food, child.gender)} {FOOD.find((f) => f.value === report.food).emoji}
              </span>
            )} />
          {meals.length > 0 && (
            <ul className="meal-list">
              {meals.map((m) => (
                <li key={m.key}>
                  <span className="meal-name">{m.emoji} {m.label}</span>
                  <span className="muted">{menu[m.key]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activities.length > 0 && (
        <section className="card">
          <SectionHead emoji="🎨" tone="sky" title="פעילויות"
            aside={<span className="muted small">{activities.length === 1 ? 'פעילות אחת' : `${activities.length} פעילויות`}</span>} />
          <ul className="activity-strip">
            {activities.map((a, i) => (
              <li key={a} className={`activity-tile tone-${['mint', 'peach', 'rose', 'sky'][i % 4]}`}>
                <span className="activity-tile-icon" aria-hidden="true">{activityIcon(a)}</span>
                <strong>{a}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.highlight && (
        <section className="card milestone">
          <span className="badge-icon tone-white" aria-hidden="true">🌟</span>
          <div>
            <span className="eyebrow-label">משהו חדש שעשיתי</span>
            <p className="milestone-text">{report.highlight}</p>
          </div>
        </section>
      )}

      {report.note && (
        <section className="card">
          <SectionHead emoji="💛" tone="butter" title="כדאי שתדעו" />
          <p className="body-text">{report.note}</p>
        </section>
      )}

      {(report.sleep || report.poop) && (
        <section className="card">
          <SectionHead emoji="😴" tone="mint" title="מנוחה" />
          <ul className="rest-list">
            {report.sleep && (
              <li>
                {sleepSentence(report.sleep, child.gender)}
                {report.sleep.status === 'slept' && <span className="muted small"> · {timeRange(report.sleep)}</span>}
              </li>
            )}
            {report.poop && <li>{poopSentence(report.poop)}</li>}
          </ul>
        </section>
      )}
    </>
  );
}

export const absentText = (child) => `${child.name} ${g(child.gender, 'לא הגיע', 'לא הגיעה')} לגן היום`;
