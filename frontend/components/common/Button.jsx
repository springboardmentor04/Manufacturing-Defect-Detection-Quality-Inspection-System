import { classNames } from '../../utils/formatters';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  icon = null,
  className = '',
  disabled,
  ...rest
}) {
  return (
    <button
      className={classNames('btn', VARIANTS[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="loader" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
