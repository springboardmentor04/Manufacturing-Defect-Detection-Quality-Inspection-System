export default function Loader({ fullPage = false, label }) {
  const spinner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
      <span className="loader" aria-hidden="true" />
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
    </div>
  );

  if (!fullPage) return spinner;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      {spinner}
    </div>
  );
}
