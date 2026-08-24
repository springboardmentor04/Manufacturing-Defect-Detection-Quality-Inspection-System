import { classNames } from '../../utils/formatters';

export default function Card({ title, scanning = false, actions, children, className = '' }) {
  return (
    <div
      className={classNames('card', scanning && 'card--scanning', className)}
      style={{
        backgroundColor: '#151A21',
        border: '1px solid #232933',
        borderRadius: 16,
        padding: '20px 24px',
        color: '#E6E9ED',
      }}
    >
      {(title || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          {title && (
            <div
              className="card-title"
              style={{ fontSize: 13, fontWeight: 600, color: '#8B93A1', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {title}
            </div>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
