import { useCallback, useEffect, useState } from 'react';
import { api, useLoad } from '../shared/api.js';
import { Credit, ErrorState, IconButton, Loading, Shell, TopBar, toast } from '../shared/ui.jsx';
import Dashboard from './Dashboard.jsx';
import ChildrenScreen from './ChildrenScreen.jsx';
import ChildUpdate from './ChildUpdate.jsx';
import TodayScreen from './TodayScreen.jsx';
import MenuScreen from './MenuScreen.jsx';
import ActivitiesScreen from './ActivitiesScreen.jsx';
import MessagesScreen from './MessagesScreen.jsx';
import StaffVacations from './StaffVacations.jsx';

const TABS = [
  { key: 'home', label: 'היום', icon: 'today' },
  { key: 'children', label: 'ילדי הגן', icon: 'face' },
  { key: 'vacations', label: 'לוח חופשות', icon: 'calendar' },
  { key: 'messages', label: 'הודעות', icon: 'message' },
];

const CLASS_KEY = 'gan:class';
function storedClass() {
  try {
    return Number(localStorage.getItem(CLASS_KEY)) || null;
  } catch {
    return null;
  }
}

/** Applies a field value to a local report so the UI responds instantly. */
function localReport(report, field, value) {
  const next = { ...report, [field]: value };
  if (field === 'sleep' && value?.status === 'slept') {
    const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    next.sleep = { ...value, minutes: toMin(value.end) - toMin(value.start) };
  }
  next.complete = !next.absent && Boolean(next.food && next.mood);
  return next;
}

export default function TeacherApp({ user, onLogout }) {
  const [tab, setTab] = useState('home');
  const [screen, setScreen] = useState(null); // an inner screen opened on top of the tabs
  const [classId, setClassId] = useState(storedClass);
  const { data, setData, error, reload } = useLoad(`/staff/today${classId ? `?classId=${classId}` : ''}`);
  const info = useLoad('/kindergarten');

  useEffect(() => {
    try {
      if (classId) localStorage.setItem(CLASS_KEY, String(classId));
      else localStorage.removeItem(CLASS_KEY);
    } catch {
      /* private mode — nothing to remember */
    }
  }, [classId]);

  // A remembered class that no longer exists falls back to the first class.
  useEffect(() => {
    if (error?.status === 404 && classId) setClassId(null);
  }, [error, classId]);

  useEffect(() => window.scrollTo(0, 0), [tab, screen]);

  const updateChildren = useCallback(
    (fn) => setData((d) => (d ? { ...d, children: d.children.map(fn) } : d)),
    [setData],
  );

  const onFail = useCallback(() => {
    toast('השמירה לא הצליחה. בודקים חיבור…');
    reload();
  }, [reload]);

  /** Batch: one field, many children, with undo. */
  const applyField = useCallback(
    async (field, entries, { undoable = true } = {}) => {
      const byId = new Map(entries.map((e) => [e.childId, e.value]));
      const previous = data.children
        .filter((c) => byId.has(c.id))
        .map((c) => ({ childId: c.id, value: toApiValue(field, c.report[field]) }));
      updateChildren((c) => (byId.has(c.id) ? { ...c, report: localReport(c.report, field, byId.get(c.id)) } : c));
      try {
        const res = await api(`/staff/classes/${data.class.id}/reports`, { method: 'POST', body: { field, entries } });
        setData((d) => ({ ...d, children: res.children }));
      } catch {
        onFail();
        return;
      }
      if (undoable && entries.length > 1) {
        toast(`עודכנו ${entries.length} ילדים`, {
          action: 'ביטול',
          onAction: () => applyField(field, previous, { undoable: false }),
        });
      }
    },
    [data, setData, updateChildren, onFail],
  );

  /** Instant single-field save, used by the quick batch screen. */
  const patchChild = useCallback(
    async (childId, fields) => {
      updateChildren((c) =>
        c.id === childId
          ? { ...c, report: Object.entries(fields).reduce((r, [k, v]) => localReport(r, k, v), c.report) }
          : c,
      );
      try {
        const { report } = await api(`/staff/children/${childId}/report`, { method: 'PATCH', body: fields });
        updateChildren((c) => (c.id === childId ? { ...c, report } : c));
      } catch {
        onFail();
      }
    },
    [updateChildren, onFail],
  );

  /** "שמירת העדכון" on the child screen: all changed fields (and supplies) in one go. */
  const saveChild = useCallback(
    async (childId, fields, supplies) => {
      try {
        const next = {};
        if (Object.keys(fields).length) {
          next.report = (await api(`/staff/children/${childId}/report`, { method: 'PATCH', body: fields })).report;
        }
        if (supplies) {
          next.supplies = (await api(`/staff/children/${childId}/supplies`, { method: 'PUT', body: supplies })).supplies;
        }
        updateChildren((c) => (c.id === childId ? { ...c, ...next } : c));
        return true;
      } catch {
        toast('השמירה לא הצליחה. נסו שוב');
        return false;
      }
    },
    [updateChildren],
  );

  const markSeen = useCallback(
    async (updateId) => {
      updateChildren((c) => ({
        ...c,
        parentUpdates: c.parentUpdates.map((u) => (u.id === updateId ? { ...u, seen: true } : u)),
      }));
      await api(`/staff/parent-updates/${updateId}/seen`, { method: 'POST' }).catch(onFail);
    },
    [updateChildren, onFail],
  );

  const saveActivities = useCallback(
    async (activities) => {
      setData((d) => ({ ...d, day: { ...d.day, activities } }));
      try {
        const res = await api(`/staff/classes/${data.class.id}/day`, { method: 'PUT', body: { activities } });
        setData((d) => ({ ...d, day: res.day }));
      } catch {
        onFail();
      }
    },
    [data, setData, onFail],
  );

  const saveMenu = useCallback(
    async (menu) => {
      try {
        const res = await api('/staff/menu', { method: 'PUT', body: menu });
        setData((d) => ({ ...d, menu: res.menu }));
        return true;
      } catch {
        toast('השמירה לא הצליחה. נסו שוב');
        return false;
      }
    },
    [setData],
  );

  const logoutButton = <IconButton icon="logout" label="יציאה" onClick={onLogout} />;
  const kindergarten = info.data?.kindergarten;
  const goTab = (key) => {
    setScreen(null);
    setTab(key);
  };
  const fab = { icon: 'bolt', label: 'עדכון מהיר לקבוצה', onClick: () => setScreen({ name: 'batch' }) };
  const frame = (content) => <Shell tabs={TABS} tab={tab} onTab={goTab} fab={data?.class ? fab : null}>{content}</Shell>;

  if (tab === 'vacations' && !screen) return frame(<StaffVacations place={kindergarten?.name} logoutButton={logoutButton} />);
  if (tab === 'messages' && !screen) {
    return frame(<MessagesScreen place={kindergarten?.name} info={info} logoutButton={logoutButton} onSeen={markSeen} />);
  }
  const tabTitle = { home: 'דשבורד', children: 'ילדי הגן' }[tab] ?? 'היום';
  const bar = <TopBar place={kindergarten?.name} title={tabTitle} action={logoutButton} />;
  if (error) return frame(<>{bar}<ErrorState onRetry={reload} /></>);
  if (!data) return frame(<>{bar}<Loading label={classId ? 'רגע, טוען את הקבוצה…' : 'רגע, טוען את היום בגן…'} /></>);
  if (!data.class) return frame(<div className="empty"><p>עוד אין כיתות בגן.</p>{logoutButton}</div>);

  const children = data.children;
  const pending = children.filter((c) => !c.report.absent && !c.report.complete);
  const classSwitcher = <ClassSwitcher classes={data.classes} value={data.class.id} onChange={setClassId} />;
  const back = () => setScreen(null);
  const common = { data, user, place: kindergarten?.name, logoutButton, classSwitcher };

  // Inner screens take the whole page (no tab bar), with a back button.
  if (screen?.name === 'child') {
    const child = children.find((c) => c.id === screen.id);
    if (child) {
      const nextPending = pending.find((c) => c.id !== child.id);
      return (
        <div className="app">
          <ChildUpdate
            key={child.id}
            child={child}
            date={data.date}
            day={data.day}
            place={data.class.name}
            nextChild={nextPending}
            onBack={back}
            onSave={saveChild}
            onSeen={markSeen}
            onOpen={(id) => setScreen({ name: 'child', id })}
            onDefineActivities={() => setScreen({ name: 'activities' })}
          />
        </div>
      );
    }
  }
  if (screen?.name === 'batch') {
    return (
      <div className="app">
        <main className="main main-plain">
          <TodayScreen key={data.class.id} {...common} onBack={back} applyField={applyField} patchChild={patchChild}
            onOpenChild={(id) => setScreen({ name: 'child', id })} />
          <Credit />
        </main>
      </div>
    );
  }
  if (screen?.name === 'menu') {
    return <div className="app"><MenuScreen {...common} menu={data.menu} onSave={saveMenu} onBack={back} /></div>;
  }
  if (screen?.name === 'activities') {
    return (
      <div className="app">
        <ActivitiesScreen key={data.class.id} {...common} onSave={saveActivities} onBack={back} />
      </div>
    );
  }

  return frame(
    <>
      {tab === 'home' && (
        <Dashboard {...common} kindergarten={kindergarten} pending={pending} onSeen={markSeen}
          open={(name) => (['children', 'messages', 'vacations'].includes(name) ? goTab(name) : setScreen({ name }))} />
      )}
      {tab === 'children' && <ChildrenScreen {...common} onOpenChild={(id) => setScreen({ name: 'child', id })} />}
    </>,
  );
}

/** All classes of the kindergarten; any staff member can work on any class. */
function ClassSwitcher({ classes, value, onChange }) {
  if (classes.length < 2) return null;
  return (
    <div className="class-switch" role="tablist" aria-label="קבוצה">
      {classes.map((c) => (
        <button key={c.id} role="tab" aria-selected={c.id === value} className={c.id === value ? 'is-on' : ''}
          onClick={() => onChange(c.id)}>
          {c.name}
        </button>
      ))}
    </div>
  );
}

/** Report values as the API expects them back (used for undo). */
function toApiValue(field, value) {
  if (field === 'sleep' && value) {
    return value.status === 'none' ? { status: 'none' } : { status: 'slept', start: value.start, end: value.end };
  }
  return value ?? null;
}
