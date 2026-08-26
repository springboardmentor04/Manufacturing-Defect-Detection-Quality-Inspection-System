export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (isNaN(d)) return iso;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function severityColor(level) {
  return (
    { Critical: 'var(--critical)', High: 'var(--high)', Medium: 'var(--medium)', Low: 'var(--low)' }[level] ||
    'var(--text-muted)'
  );
}

export const CHART_DEFAULTS = {
  color: '#8a97b3',
  grid: 'rgba(255,255,255,0.05)',
};
