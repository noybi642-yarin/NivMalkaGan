import { useState } from 'react';
import { api, useLoad } from '../shared/api.js';
import { formatTime, parentUpdateText } from '../shared/copy.js';
import { Loading, SectionHead, TopBar, toast } from '../shared/ui.jsx';

/** הודעות: the one message parents see from the gan, and what parents wrote this morning. */
export default function MessagesScreen({ place, info, logoutButton, onSeen }) {
  const inbox = useLoad('/staff/parent-updates');
  const kindergarten = info.data?.kindergarten;

  async function saveInfo(patch) {
    const next = { ...kindergarten, ...patch };
    try {
      const res = await api('/staff/kindergarten', { method: 'PUT', body: next });
      info.setData(res);
      return true;
    } catch {
      toast('השמירה לא הצליחה. נסו שוב');
      return false;
    }
  }

  async function markSeen(id) {
    inbox.setData((d) => ({ parentUpdates: d.parentUpdates.map((u) => (u.id === id ? { ...u, seen: true } : u)) }));
    await onSeen(id);
  }

  return (
    <>
      <TopBar place={place} title="הודעות" action={logoutButton} />
      {!kindergarten ? <Loading /> : <NoticeCard key={kindergarten.notice ?? ''} notice={kindergarten.notice} onSave={saveInfo} />}

      <section className="card">
        <SectionHead emoji="💌" tone="lilac" title="הודעות מההורים היום" />
        {!inbox.data ? <Loading /> : inbox.data.parentUpdates.length === 0 ? (
          <p className="muted">אין הודעות מההורים היום.</p>
        ) : (
          <ul className="note-list">
            {inbox.data.parentUpdates.map((u) => (
              <li key={u.id} className={u.seen ? 'is-seen' : ''}>
                <div>
                  <p><strong>{u.childName}</strong> <span className="muted small">· {u.className} · {formatTime(u.createdAt)}</span></p>
                  <p>{parentUpdateText(u, u.gender)}</p>
                  {u.note && <p className="muted small">{u.note}</p>}
                </div>
                {u.seen ? <span className="seen">✓ נקרא</span> : (
                  <button className="btn btn-small btn-soft" onClick={() => markSeen(u.id)}>ראיתי</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {kindergarten && <GanDetails kindergarten={kindergarten} onSave={saveInfo} />}
    </>
  );
}

function NoticeCard({ notice, onSave }) {
  const [draft, setDraft] = useState(notice ?? '');
  const [busy, setBusy] = useState(false);

  async function publish(text) {
    setBusy(true);
    if (await onSave({ notice: text })) toast(text ? 'ההודעה פורסמה להורים 📢' : 'ההודעה הוסרה');
    setBusy(false);
  }

  return (
    <section className="card">
      <SectionHead emoji="📢" tone="peach" title="הודעה להורים"
        aside={notice ? <span className="pill pill-done">מוצגת להורים</span> : null} />
      <p className="muted small hint-line">מופיעה אצל כל ההורים בגן, תחת "הודעות מהגן".</p>
      <textarea className="input" rows={3} maxLength={280} value={draft} aria-label="הודעה להורים"
        placeholder="למשל: מחר פעילות מים — נא להביא בגדים להחלפה וכובע" onChange={(e) => setDraft(e.target.value)} />
      <button className="btn btn-primary btn-block" disabled={busy || draft.trim() === (notice ?? '')}
        onClick={() => publish(draft.trim() || null)}>
        {notice ? 'עדכון ההודעה' : 'פרסום להורים'}
      </button>
      {notice && (
        <button className="link-btn link-danger" disabled={busy} onClick={() => { setDraft(''); publish(null); }}>
          הסרת ההודעה
        </button>
      )}
    </section>
  );
}

function GanDetails({ kindergarten, onSave }) {
  const [hours, setHours] = useState(kindergarten.hours ?? '');
  const [phone, setPhone] = useState(kindergarten.phone ?? '');
  return (
    <section className="card">
      <SectionHead emoji="🏡" tone="mint" title="פרטי הגן להורים" />
      <label className="field">
        <span>שעות פעילות</span>
        <input className="input" value={hours} maxLength={120} placeholder="א׳–ה׳ 07:30–16:00" onChange={(e) => setHours(e.target.value)}
          onBlur={() => hours.trim() !== (kindergarten.hours ?? '') && onSave({ hours: hours.trim() || null })} />
      </label>
      <label className="field">
        <span>טלפון הגן</span>
        <input className="input" value={phone} maxLength={30} dir="ltr" placeholder="03-0000000" onChange={(e) => setPhone(e.target.value)}
          onBlur={() => phone.trim() !== (kindergarten.phone ?? '') && onSave({ phone: phone.trim() || null })} />
      </label>
    </section>
  );
}
