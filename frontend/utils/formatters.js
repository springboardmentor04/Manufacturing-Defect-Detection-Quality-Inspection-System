export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}
