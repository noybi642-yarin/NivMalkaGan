import { useLoad } from '../shared/api.js';
import { ErrorState, Loading, PageHeader } from '../shared/ui.jsx';
import VacationList from '../shared/VacationList.jsx';

export default function ParentVacations({ logoutButton }) {
  const { data, error, reload } = useLoad('/vacations');
  if (error) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;
  return (
    <>
      <PageHeader title={data.title} subtitle={data.subtitle} action={logoutButton} />
      <VacationList schedule={data} />
    </>
  );
}
