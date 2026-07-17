import './StatusTag.css';

const COLOR_VAR = {
  pending: '--status-pending',
  approved: '--status-approved',
  rejected: '--status-rejected',
};

export function StatusTag({ status }) {
  const colorVar = COLOR_VAR[status] || '--ash';
  return (
    <span className="status-tag mono" style={{ '--tag-color': `var(${colorVar})` }}>
      {status.toUpperCase()}
    </span>
  );
}
