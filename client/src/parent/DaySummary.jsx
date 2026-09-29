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
  sleepLine,
} from '../shared/copy.js';
import { SectionHead } from '../shared/ui.jsx';

/**
 * The child's day, section by section: איך עבר עליי היום · מה אכלתי · פעילויות · משהו חדש שעשיתי ·
 * כדאי שתדעו · מנוחה. A section with nothing to say is not shown.
 */
export default function DaySummary({ child, report, day, menu }) {
  const mood = MOOD.find((m) => m.value === report.mood);
  // A meal is shown when it is on the menu or the staff rated how the child ate it.
  const meals = MENU_MEALS.filter((m) => menu?.[m.key] || report[`food_${m.key}`]);
  const activities = childActivities(report, day);

  return (
    <>
      {mood && (
        <section className="card mood-summary">
          <span className="mood-summary-emoji" aria-hidden="true">{mood.emoji}</span>
          <div>
            <span className="eyebrow-label">איך עבר עליי היום?</span>
            <h2>{moodSentence(report.mood, child.gender)}</h2>
          </div>
        </section>
      )}

      {meals.length > 0 && (
        <section className="card">
          <SectionHead emoji="🍎" tone="peach" title="מה אכלתי" />
          <ul className="meal-list">
            {meals.map((m) => {
              const ate = report[`food_${m.key}`];
              return (
                <li key={m.key}>
                  <span className="meal-head">
                    <span className="meal-name">{m.emoji} {m.label}</span>
                    {ate && (
                      <span className={`pill ${ate === 'well' ? 'pill-done' : 'pill-soft'}`}>
                        {foodLabel(ate, child.gender)} {FOOD.find((f) => f.value === ate).emoji}
                      </span>
                    )}
                  </span>
                  {menu?.[m.key] && <span className="muted">{menu[m.key]}</span>}
                </li>
              );
            })}
          </ul>
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

      {(report.sleep_quality || report.poop) && (
        <section className="card">
          <SectionHead emoji="😴" tone="mint" title="מנוחה" />
          <ul className="rest-list">
            {report.sleep_quality && <li>{sleepLine(report.sleep_quality, report.sleep_minutes, child.gender)}</li>}
            {report.poop && <li>{poopSentence(report.poop)}</li>}
          </ul>
        </section>
      )}
    </>
  );
}

export const absentText = (child) => `${child.name} ${g(child.gender, 'לא הגיע', 'לא הגיעה')} לגן היום`;
