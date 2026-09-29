import { useEffect, useState } from 'react';
import { api } from './shared/api.js';
import { Icon } from './shared/ui.jsx';

const ENTRANCES = [
  { role: 'parent', label: 'כניסת הורים', emoji: '👨‍👩‍👧', tag: 'הורים לילדי הגן', text: 'היום של הילד/ה, תפריט, פעילויות והודעות' },
  { role: 'staff', label: 'כניסת צוות הגן', emoji: '🧑‍🏫', tag: 'גננות ואנשי צוות', text: 'עדכון יומי מהיר וקשר עם ההורים' },
];

export default function Login({ onLogin }) {
  const [role, setRole] = useState('parent');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api('/config').then(setConfig).catch(() => {});
  }, []);

  async function login(creds) {
    setBusy(true);
    setError('');
    try {
      const { user } = await api('/auth/login', { method: 'POST', body: { ...creds, role } });
      onLogin(user);
    } catch (err) {
      setError(err.status === 429 ? 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות' : 'שם המשתמש או הסיסמה לא נכונים');
      setBusy(false);
    }
  }

  const demo = config?.demo && config.demoAccounts.find((a) => a.role === role);

  return (
    <div className="login">
      <section className="login-hero">
        <HeroArt />
        <span className="pill pill-mint">🌿 היום בגן · פחות התעסקות, יותר שקט</span>
        <h1>ברוכים הבאים לגן <span aria-hidden="true">🌈</span></h1>
        <p className="muted">המקום הקטן שמחבר אתכם ליום של הילדים</p>
      </section>

      <div className="entrances" role="radiogroup" aria-label="סוג כניסה">
        {ENTRANCES.map((e) => (
          <button key={e.role} role="radio" aria-checked={role === e.role}
            className={`entrance entrance-${e.role}${role === e.role ? ' is-on' : ''}`}
            onClick={() => { setRole(e.role); setError(''); }}>
            <span className="entrance-icon" aria-hidden="true">{e.emoji}</span>
            <span className="entrance-text">
              <span className="entrance-title">
                <strong>{e.label}</strong>
                <span className="pill pill-soft">{e.tag}</span>
              </span>
              <span className="muted small">{e.text}</span>
            </span>
            <span className="entrance-check" aria-hidden="true">{role === e.role && <Icon name="check" size={18} />}</span>
          </button>
        ))}
      </div>

      <form className="card login-card" onSubmit={(e) => { e.preventDefault(); login({ username, password }); }}>
        <div className="login-card-head">
          <h2>{ENTRANCES.find((e) => e.role === role).label}</h2>
          <span className="pill pill-soft">🔒 מאובטח ופרטי</span>
        </div>
        <label className="field">
          <span>שם משתמש</span>
          <input className="input" autoComplete="username" dir="ltr" autoCapitalize="none" spellCheck={false}
            placeholder="שם משתמש" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="field">
          <span>סיסמה</span>
          <input className="input" type="password" autoComplete="current-password" dir="ltr"
            placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block btn-big" disabled={busy}>כניסה למערכת</button>
      </form>

      {demo && (
        <button className="demo-btn" disabled={busy} onClick={() => login({ username: demo.username, password: config.demoPassword })}>
          <strong>כניסה מהירה לדמו</strong>
          <span>{role === 'parent' ? `כהורים (${demo.name})` : `כצוות הגן (${demo.name})`}</span>
        </button>
      )}

      <p className="login-foot muted small">🌸 שומרים על פרטיות הילדים — בלי תמונות, רק מה שחשוב</p>
    </div>
  );
}

/** Sun, rainbow and א-ב-ג blocks — the storybook scene from the design. */
function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 340 170" role="img" aria-label="שמש מחייכת, קשת וקוביות" fill="none">
      <path d="M60 150a110 110 0 0 1 220 0" stroke="#ffb4a1" strokeWidth="8" strokeLinecap="round" opacity=".85" />
      <path d="M72 150a98 98 0 0 1 196 0" stroke="#c0edd4" strokeWidth="7" strokeLinecap="round" opacity=".85" />
      <path d="M83 150a87 87 0 0 1 174 0" stroke="#dee1f8" strokeWidth="6" strokeLinecap="round" opacity=".85" />
      <g transform="translate(170 52)">
        <circle r="30" fill="#ffdbd2" opacity=".6" />
        {[[0, -38, 0, -44], [27, -27, 32, -32], [38, 0, 44, 0], [-27, -27, -32, -32], [-38, 0, -44, 0]].map(([x1, y1, x2, y2]) => (
          <line key={`${x1}${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9a442d" strokeWidth="3" strokeLinecap="round" />
        ))}
        <circle r="24" fill="#e07a5f" />
        <circle cx="-11" cy="4" r="3.5" fill="#ffdbd2" opacity=".8" />
        <circle cx="11" cy="4" r="3.5" fill="#ffdbd2" opacity=".8" />
        <circle cx="-7" cy="-2" r="2.2" fill="#5b1604" />
        <circle cx="7" cy="-2" r="2.2" fill="#5b1604" />
        <path d="M-6 6q6 7 12 0" stroke="#5b1604" strokeWidth="2" strokeLinecap="round" />
      </g>
      <path d="M52 85a14 14 0 0 1 24-9 18 18 0 0 1 28 4 12 12 0 0 1 8 12H50a8 8 0 0 1 2-7Z" fill="#fff" />
      <path d="M237 92a12 12 0 0 1 20-10 16 16 0 0 1 26 4 12 12 0 0 1 8 12h-56a8 8 0 0 1 2-6Z" fill="#fff" />
      {[['א', 54, 116, '#ffb4a1', '#ffdbd2', '#7c2e19'], ['ב', 86, 122, '#a5d0b8', '#c0edd4', '#002114'], ['ג', 254, 118, '#c5877b', '#ffdad3', '#351009']].map(
        ([letter, x, y, edge, face, ink]) => (
          <g key={letter} transform={`translate(${x} ${y})`}>
            <rect width="28" height="28" rx="6" fill={edge} />
            <rect x="2" y="2" width="24" height="24" rx="4" fill={face} />
            <text x="14" y="19" textAnchor="middle" fontSize="14" fontWeight="700" fill={ink} fontFamily="Rubik, sans-serif">{letter}</text>
          </g>
        ),
      )}
      {[[26, 142, '#ffdbd2', '#9a442d'], [122, 145, '#c0edd4', '#3e6653'], [230, 144, '#ffdbd2', '#e07a5f'], [295, 140, '#ffdad3', '#865046']].map(
        ([x, y, petal, center]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <path d="M0 4q2 8 3 12" stroke="#3e6653" strokeWidth="1.8" strokeLinecap="round" />
            <circle r="4" fill={petal} />
            <circle r="1.5" fill={center} />
          </g>
        ),
      )}
    </svg>
  );
}
