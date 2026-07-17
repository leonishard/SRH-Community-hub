import { useEffect, useState } from 'react';
import { listEvents } from '../api/events';
import { StatusTag } from '../components/StatusTag';
import '../components/Card.css';

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Events</h1>
      <p className="caption" style={{ marginTop: '0.5rem' }}>
        Approved events across every group. Signed-in Group Managers and Coordinators also see
        pending submissions for groups they manage.
      </p>

      {loading && <p className="caption">Loading events…</p>}
      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {!loading && !error && events.length === 0 && <p className="caption">No events yet.</p>}

      {!loading && !error && events.length > 0 && (
        <div className="card-grid">
          {events.map((event) => (
            <div className="card" key={event.documentId}>
              <div className="card__meta">
                <StatusTag status={event.status} />
                {event.group && <span className="caption">{event.group.name}</span>}
              </div>
              <div className="card__title">{event.title}</div>
              <div className="card__description">{event.description}</div>
              <div className="caption">
                {formatDate(event.date)}
                {event.location ? ` · ${event.location}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
