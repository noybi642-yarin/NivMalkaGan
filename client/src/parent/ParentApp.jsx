import { useEffect, useState } from 'react';
import { useLoad } from '../shared/api.js';
import { childWord } from '../shared/copy.js';
import { ErrorState, IconButton, Loading, Shell } from '../shared/ui.jsx';
import ParentToday from './ParentToday.jsx';
import ParentUpdate from './ParentUpdate.jsx';
import MyChild from './MyChild.jsx';

const STORAGE_KEY = 'gan:child';

function storedChild() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export default function ParentApp({ user, onLogout }) {
  const [tab, setTab] = useState('today');
  const { data, error, reload } = useLoad('/parent/children');
  const [childId, setChildId] = useState(storedChild);

  const children = data?.children ?? [];
  const child = children.find((c) => c.id === childId) ?? children[0];

  useEffect(() => {
    try {
      if (child) localStorage.setItem(STORAGE_KEY, String(child.id));
    } catch {
      /* private mode — nothing to remember */
    }
  }, [child]);

  const tabs = [
    { key: 'today', label: 'היום', icon: 'today' },
    { key: 'update', label: 'הודעות לגן', icon: 'message' },
    { key: 'child', label: child ? childWord(child.gender) : 'הילד/ה שלי', icon: 'heart' },
  ];

  const logoutButton = <IconButton icon="logout" label="יציאה" onClick={onLogout} />;
  const switcher = children.length > 1 && (
    <div className="child-switch" role="tablist" aria-label="בחירת ילד/ה">
      {children.map((c) => (
        <button key={c.id} role="tab" aria-selected={c.id === child.id}
          className={c.id === child.id ? 'is-on' : ''} onClick={() => setChildId(c.id)}>
          {c.name}
        </button>
      ))}
    </div>
  );

  let content;
  if (error) content = <ErrorState onRetry={reload} />;
  else if (!data) content = <Loading />;
  else if (!child) content = <div className="empty"><p>עוד לא קושרו ילדים לחשבון. פנו לצוות הגן.</p>{logoutButton}</div>;
  else {
    const props = { user, child, logoutButton, switcher, goTo: setTab };
    content = (
      <>
        {tab === 'today' && <ParentToday key={child.id} {...props} />}
        {tab === 'update' && <ParentUpdate key={child.id} {...props} />}
        {tab === 'child' && <MyChild key={child.id} {...props} />}
      </>
    );
  }

  return <Shell tabs={tabs} tab={tab} onTab={setTab}>{content}</Shell>;
}
