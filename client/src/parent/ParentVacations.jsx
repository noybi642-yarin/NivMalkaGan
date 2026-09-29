import { useLoad } from '../shared/api.js';
import { ErrorState, Loading, TopBar } from '../shared/ui.jsx';
import VacationList from '../shared/VacationList.jsx';

export default function ParentVacations({ place, logoutButton }) {
  const { data, error, reload } = useLoad('/vacations');
  const bar = <TopBar place={place} title="לוח חופשות" action={logoutButton} />;
  if (error) return <>{bar}<ErrorState onRetry={reload} /></>;
  if (!data) return <>{bar}<Loading label="רגע, טוען את לוח החופשות…" /></>;
  return (
    <>
      <TopBar place={place} title="לוח חופשות" action={logoutButton} />
      <section className="hello">
        <h1>{data.title} <span aria-hidden="true">☀️</span></h1>
        <p className="muted">{data.subtitle}</p>
      </section>
      <VacationList schedule={data} />
    </>
  );
}
