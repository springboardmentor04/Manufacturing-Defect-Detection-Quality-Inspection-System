export default function Input({ label, error, id, ...rest }) {
  const inputId = id || rest.name;
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <input id={inputId} className="field-input" {...rest} />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
