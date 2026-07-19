/** Compact, prominent date badge used on event cards (month/day/time). */
export function EventDateBadge({ iso }) {
  const date = new Date(iso);
  const month = date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const day = date.toLocaleDateString(undefined, { day: '2-digit' });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="card__date">
      <span className="card__date-month mono">{month}</span>
      <span className="card__date-day mono">{day}</span>
      <span className="card__date-time mono">{time}</span>
    </div>
  );
}
