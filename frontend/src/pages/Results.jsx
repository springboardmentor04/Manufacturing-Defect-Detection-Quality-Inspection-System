import { useEffect, useState } from 'react';
import { Api } from '../api';
import { useSetPageHeader } from '../context/PageHeaderContext';
import { Skeleton, ErrorBanner, EmptyState, InspectionsTable } from '../components/Shared';

export default function Results() {
  useSetPageHeader('Product Inspection Results', 'Latest AI inspection outcomes across your uploaded products.');

  const [inspections, setInspections] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Api.listInspections({ limit: 25 })
      .then((r) => {
        if (!cancelled) setInspections(r.inspections);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!inspections) return <Skeleton h={400} />;

  return (
    <div className="card">
      {inspections.length ? (
        <InspectionsTable rows={inspections} />
      ) : (
        <EmptyState title="No inspection results yet" subtitle="Upload a product image to generate your first result." />
      )}
    </div>
  );
}
