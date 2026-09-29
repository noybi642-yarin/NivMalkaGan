import {
  MOOD,
  activityIcon,
  foodSentence,
  g,
  joinHe,
  moodSentence,
  poopSentence,
  sleepSentence,
  timeRange,
} from '../shared/copy.js';

/** The child's day in the order a parent reads it: feeling + moment, then the facts. */
export default function DaySummary({ child, report, day, showHero = true }) {
  const mood = MOOD.find((m) => m.value === report.mood);
  const items = [];
  if (report.food) {
    items.push({
      icon: '🍽️',
      text: foodSentence(report.food, child.gender),
      sub: [day.menuBreakfast && `בוקר: ${day.menuBreakfast}`, day.menuLunch && `צהריים: ${day.menuLunch}`].filter(Boolean),
    });
  } else if (day.menuBreakfast || day.menuLunch) {
    items.push({
      icon: '🍽️',
      text: 'תפריט היום',
      sub: [day.menuBreakfast && `בוקר: ${day.menuBreakfast}`, day.menuLunch && `צהריים: ${day.menuLunch}`].filter(Boolean),
    });
  }
  if (report.sleep) {
    items.push({
      icon: '😴',
      text: sleepSentence(report.sleep, child.gender),
      sub: report.sleep.status === 'slept' ? [timeRange(report.sleep)] : [],
    });
  }
  if (report.poop) items.push({ icon: '💩', text: poopSentence(report.poop), sub: [] });
  if (day.activities.length) {
    items.push({ icon: activityIcon(day.activities[0]), text: `היום בגן: ${joinHe(day.activities)}`, sub: [] });
  }

  return (
    <>
      {showHero && (mood || report.highlight) && (
        <section className={`hero hero-${report.mood || 'none'}`}>
          {mood && (
            <p className="hero-mood">
              <span className="hero-emoji" aria-hidden="true">{mood.emoji}</span>
              {moodSentence(report.mood, child.name)}
            </p>
          )}
          {report.highlight && (
            <blockquote className="moment">
              <span className="moment-label">רגע קטן מהיום</span>
              <p>{report.highlight}</p>
            </blockquote>
          )}
        </section>
      )}

      {report.note && (
        <section className="card card-note">
          <h2 className="card-title">כדאי לדעת</h2>
          <p>{report.note}</p>
        </section>
      )}

      {items.length > 0 && (
        <ul className="card timeline" aria-label={`היום של ${child.name}`}>
          {items.map((it) => (
            <li key={it.text}>
              <span className="tl-icon" aria-hidden="true">{it.icon}</span>
              <div>
                <p>{it.text}</p>
                {it.sub.map((s) => <p key={s} className="muted small">{s}</p>)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export const absentText = (child) => `${child.name} ${g(child.gender, 'לא הגיע', 'לא הגיעה')} לגן היום`;
