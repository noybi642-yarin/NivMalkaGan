import { useEffect, useState } from 'react';
import { api } from './shared/api.js';
import { Toaster } from './shared/ui.jsx';
import Login from './Login.jsx';
import TeacherApp from './teacher/TeacherApp.jsx';
import ParentApp from './parent/ParentApp.jsx';
import ManagerApp from './manager/ManagerApp.jsx';

const APPS = { staff: TeacherApp, parent: ParentApp, manager: ManagerApp };

export default function App() {
  const [user, setUser] = useState(undefined);

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
      {RoleApp ? <RoleApp user={user} onLogout={logout} /> : <Login onLogin={setUser} />}
      <Toaster />
    </>
  );
}
