import { useEffect, useState } from 'react';
import { api } from './shared/api.js';

const ENTRANCES = [
  { role: 'parent', label: 'כניסת הורים' },
  { role: 'staff', label: 'כניסת צוות הגן' },
];

export default function Login({ onLogin }) {
  const [role, setRole] = useState('parent');
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
      const { user } = await api('/auth/login', { method: 'POST', body: { ...creds, role } });
      onLogin(user);
    } catch (err) {
      setError(err.status === 429 ? 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות' : 'מספר הטלפון או הסיסמה לא נכונים');
      setBusy(false);
    }
  }

  const demo = config?.demo && config.demoAccounts.find((a) => a.role === role);

  return (
    <div className="login">
      <div className="login-brand">
        <div className="logo" aria-hidden="true">
          <span />
        </div>
        <h1>היום בגן</h1>
        <p>פחות התעסקות לצוות. יותר שקט להורים.</p>
      </div>

      <div className="login-entrances" role="tablist" aria-label="סוג כניסה">
        {ENTRANCES.map((e) => (
          <button key={e.role} role="tab" aria-selected={role === e.role} className={role === e.role ? 'is-on' : ''}
            onClick={() => { setRole(e.role); setError(''); }}>
            {e.label}
          </button>
        ))}
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
        <button className="btn btn-primary btn-block" disabled={busy}>
          {ENTRANCES.find((e) => e.role === role).label}
        </button>
      </form>

      {demo && (
        <section className="demo">
          <button className="demo-btn" disabled={busy}
            onClick={() => login({ phone: demo.phone, password: config.demoPassword })}>
            <strong>כניסה מהירה לדמו</strong>
            <span>{role === 'parent' ? `כהורים (${demo.name})` : `כצוות הגן (${demo.name})`}</span>
          </button>
        </section>
      )}
    </div>
  );
}
