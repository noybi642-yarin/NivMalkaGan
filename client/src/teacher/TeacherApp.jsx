import { useCallback, useState } from 'react';
import { api, useLoad } from '../shared/api.js';
import { ErrorState, IconButton, Loading, Shell, toast } from '../shared/ui.jsx';
import TodayScreen from './TodayScreen.jsx';
import ChildrenScreen from './ChildrenScreen.jsx';
import ClassDayScreen from './ClassDayScreen.jsx';
import ChildSheet from './ChildSheet.jsx';

const TABS = [
  { key: 'today', label: 'היום', icon: 'today' },
  { key: 'children', label: 'הילדים', icon: 'children' },
  { key: 'gan', label: 'הגן', icon: 'gan' },
];

/** Applies a field value to a local report so the UI responds instantly. */
function localReport(report, field, value) {
  const next = { ...report, [field]: value };
  if (field === 'sleep' && value?.status === 'slept') {
    const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    next.sleep = { ...value, minutes: toMin(value.end) - toMin(value.start) };
  }
  next.complete = !next.absent && Boolean(next.food && next.sleep && next.poop && next.mood);
  return next;
}

export default function TeacherApp({ user, onLogout }) {
  const [tab, setTab] = useState('today');
  const [classId, setClassId] = useState(null);
  const { data, setData, error, reload } = useLoad(`/staff/today${classId ? `?classId=${classId}` : ''}`);
  const [openChildId, setOpenChildId] = useState(null);

  const updateChildren = useCallback(
    (fn) => setData((d) => (d ? { ...d, children: d.children.map(fn) } : d)),
    [setData],
  );

  const onFail = useCallback(() => {
    toast('השמירה לא הצליחה. בודקים חיבור…');
    reload();
  }, [reload]);

  /** Batch: one field, many children. Returns a function that undoes it. */
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

  const setSupplies = useCallback(
    async (childId, items, otherText) => {
      try {
        const { supplies } = await api(`/staff/children/${childId}/supplies`, { method: 'PUT', body: { items, otherText } });
        updateChildren((c) => (c.id === childId ? { ...c, supplies } : c));
      } catch {
        onFail();
      }
    },
    [updateChildren, onFail],
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

  const saveDay = useCallback(
    async (day) => {
      setData((d) => ({ ...d, day }));
      try {
        const res = await api(`/staff/classes/${data.class.id}/day`, { method: 'PUT', body: day });
        setData((d) => ({ ...d, day: res.day }));
      } catch {
        onFail();
      }
    },
    [data, setData, onFail],
  );

  const logoutButton = <IconButton icon="logout" label="יציאה" onClick={onLogout} />;

  if (error) return <Shell tabs={TABS} tab={tab} onTab={setTab}><ErrorState onRetry={reload} /></Shell>;
  if (!data) return <Shell tabs={TABS} tab={tab} onTab={setTab}><Loading /></Shell>;
  if (!data.class) {
    return (
      <Shell tabs={TABS} tab={tab} onTab={setTab}>
        <div className="empty"><p>עוד לא שויכת לכיתה. פנו להנהלת הגן.</p>{logoutButton}</div>
      </Shell>
    );
  }

  const present = data.children.filter((c) => !c.report.absent);
  const pending = present.filter((c) => !c.report.complete).length;
  const children = data.children;
  const openIndex = children.findIndex((c) => c.id === openChildId);
  const openChild = openIndex > -1 ? children[openIndex] : null;

  const common = { data, user, onOpenChild: setOpenChildId, logoutButton, classId: data.class.id, onClass: setClassId };

  return (
    <Shell tabs={TABS.map((t) => (t.key === 'children' && pending ? { ...t, badge: pending } : t))} tab={tab} onTab={setTab}>
      {tab === 'today' && <TodayScreen {...common} applyField={applyField} patchChild={patchChild} markSeen={markSeen} />}
      {tab === 'children' && <ChildrenScreen {...common} />}
      {tab === 'gan' && <ClassDayScreen {...common} saveDay={saveDay} />}

      {openChild && (
        <ChildSheet
          key={openChild.id}
          child={openChild}
          date={data.date}
          position={`${openIndex + 1}/${children.length}`}
          onClose={() => setOpenChildId(null)}
          onNext={() => setOpenChildId(children[(openIndex + 1) % children.length].id)}
          patchChild={patchChild}
          setSupplies={setSupplies}
          markSeen={markSeen}
        />
      )}
    </Shell>
  );
}

/** Report values as the API expects them back (used for undo). */
function toApiValue(field, value) {
  if (field === 'sleep' && value) {
    return value.status === 'none' ? { status: 'none' } : { status: 'slept', start: value.start, end: value.end };
  }
  return value ?? null;
}
