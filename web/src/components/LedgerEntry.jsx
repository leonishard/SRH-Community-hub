import './LedgerEntry.css';

function formatTimestamp(iso) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

export function LedgerEntry({ entry }) {
  return (
    <div className="ledger-entry" style={{ '--accent': `var(${entry.accent})` }}>
      <span className="ledger-entry__time mono">{formatTimestamp(entry.timestamp)}</span>
      <span className="ledger-entry__text">{entry.text}</span>
    </div>
  );
}
