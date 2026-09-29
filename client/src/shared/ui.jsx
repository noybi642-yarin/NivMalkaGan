import { useEffect, useRef, useState } from 'react';

const ICONS = {
  today: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  children: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.8 2.8 2.6 3 5.2',
  gan: 'M3 10.5 12 4l9 6.5M5 9v11h14V9M10 20v-5h4v5',
  message: 'M4 5h16v11H9l-5 4V5ZM8 9.5h8M8 12.5h5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  classes: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  calendar: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12ZM4 10h16M8.5 3v4M15.5 3v4',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  plus: 'M12 5v14M5 12h14',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17 19 7',
  chevron: 'M15 6l-6 6 6 6',
};

export function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Shell({ tabs, tab, onTab, children }) {
  return (
    <div className="app">
      <main className="main">{children}</main>
      <nav className="nav" aria-label="ניווט ראשי">
        {tabs.map((t) => (
          <button key={t.key} className={`nav-item${t.key === tab ? ' is-active' : ''}`}
            aria-current={t.key === tab ? 'page' : undefined} onClick={() => onTab(t.key)}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
            {t.badge ? <i className="nav-badge">{t.badge}</i> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function IconButton({ icon, label, onClick }) {
  return (
    <button className="icon-btn" onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} size={20} />
    </button>
  );
}

/** Tapping the selected option again clears it — mistakes are one tap to undo. */
export function Segmented({ options, value, onChange, size, label }) {
  return (
    <div className={`seg${size ? ` seg-${size}` : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => onChange(value === o.value ? null : o.value)}>
          {o.emoji && <span className="seg-emoji">{o.emoji}</span>}
          {o.short}
        </button>
      ))}
    </div>
  );
}

export function Chip({ on, onClick, children }) {
  return (
    <button className={`chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>
      {on && <Icon name="check" size={16} />}
      {children}
    </button>
  );
}

export function Progress({ value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 100;
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Sheet({ open, onClose, children, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}
        onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {children}
      </div>
    </div>
  );
}

let toastSetter = null;
/** toast('נשמר') or toast('סומן ל-8', { action: 'ביטול', onAction }) */
export function toast(text, opts = {}) {
  toastSetter?.({ text, ...opts, id: Date.now() });
}

export function Toaster() {
  const [t, setT] = useState(null);
  useEffect(() => {
    toastSetter = setT;
    return () => { toastSetter = null; };
  }, []);
  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => setT(null), t.action ? 6000 : 2500);
    return () => clearTimeout(timer);
  }, [t]);
  if (!t) return null;
  return (
    <div className="toast" role="status" key={t.id}>
      <span>{t.text}</span>
      {t.action && (
        <button onClick={() => { t.onAction(); setT(null); }}>{t.action}</button>
      )}
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading" aria-busy="true">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton short" />
    </div>
  );
}

export function ErrorState({ onRetry }) {
  return (
    <div className="empty">
      <p>משהו לא הסתדר בטעינה</p>
      <button className="btn btn-ghost" onClick={onRetry}>לנסות שוב</button>
    </div>
  );
}

/** Text that saves itself on blur (and when the component unmounts with unsaved changes). */
export function AutoText({ value, onSave, placeholder, rows = 2, label, maxLength = 280 }) {
  const [draft, setDraft] = useState(value ?? '');
  const saved = useRef(value ?? '');
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useEffect(() => {
    setDraft(value ?? '');
    saved.current = value ?? '';
  }, [value]);

  useEffect(() => () => {
    if (draftRef.current.trim() !== saved.current.trim()) saveRef.current(draftRef.current.trim() || null);
  }, []);

  const commit = () => {
    if (draft.trim() === saved.current.trim()) return;
    saved.current = draft.trim();
    onSave(draft.trim() || null);
  };

  return (
    <textarea className="input" rows={rows} value={draft} placeholder={placeholder} aria-label={label}
      maxLength={maxLength} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
  );
}
