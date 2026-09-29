import { useEffect, useState } from 'react';
import { api } from './shared/api.js';
import { ErrorBoundary, Toaster } from './shared/ui.jsx';
import Login from './Login.jsx';
import TeacherApp from './teacher/TeacherApp.jsx';
import ParentApp from './parent/ParentApp.jsx';

const APPS = { staff: TeacherApp, parent: ParentApp };

export default function App() {
  const [user, setUser] = useState(undefined);
  const [resets, setResets] = useState(0);

  useEffect(() => {
    api('/me').then((d) => setUser(d.user)).catch(() => setUser(null));
    const onUnauthorized = () => setUser(null);
    window.addEventListener('gan:unauthorized', onUnauthorized);
    return () => window.removeEventListener('gan:unauthorized', onUnauthorized);
  }, []);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  };

  if (user === undefined) return <div className="splash" aria-busy="true" />;
  const RoleApp = user && APPS[user.role];
  return (
    <>
      {RoleApp ? (
        <ErrorBoundary onReset={() => setResets((n) => n + 1)}>
          <RoleApp key={resets} user={user} onLogout={logout} />
        </ErrorBoundary>
      ) : (
        <Login onLogin={setUser} />
      )}
      <Toaster />
    </>
  );
}
