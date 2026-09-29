import { useEffect, useState } from 'react';
import { api } from './shared/api.js';

const DEMO_LABELS = { parent: 'הורה', staff: 'צוות הגן', manager: 'הנהלה' };

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState('');
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
      const { user } = await api('/auth/login', { method: 'POST', body: creds });
      onLogin(user);
    } catch (err) {
      setError(err.status === 429 ? 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות' : 'מספר הטלפון או הסיסמה לא נכונים');
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-brand">
        <div className="logo" aria-hidden="true">
          <span />
        </div>
        <h1>היום בגן</h1>
        <p>פחות התעסקות לצוות. יותר שקט להורים.</p>
      </div>

      <form className="card login-card" onSubmit={(e) => { e.preventDefault(); login({ phone, password }); }}>
        <label className="field">
          <span>מספר טלפון</span>
          <input className="input" type="tel" inputMode="tel" autoComplete="username" dir="ltr"
            placeholder="050-0000000" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label className="field">
          <span>סיסמה</span>
          <input className="input" type="password" autoComplete="current-password" dir="ltr"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>כניסה</button>
      </form>

      {config?.demo && (
        <section className="demo">
          <p>כניסה מהירה לדמו</p>
          <div className="demo-grid">
            {config.demoAccounts.map((a) => (
              <button key={a.role} className="demo-btn" disabled={busy}
                onClick={() => login({ phone: a.phone, password: config.demoPassword })}>
                <strong>{a.name}</strong>
                <span>{DEMO_LABELS[a.role]}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
