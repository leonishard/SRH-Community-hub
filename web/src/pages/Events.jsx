import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { listEvents } from '../api/events';
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
          {events.map((event) => {
            const posterUrl = event.poster?.url ? `${API_URL}${event.poster.url}` : null;
            const attendeeCount = event.attendees?.length;
            return (
              <Link to={`/events/${event.documentId}`} className="card card__link" key={event.documentId}>
                {posterUrl ? (
                  <img className="card__poster" src={posterUrl} alt="" />
                ) : (
                  <div className="card__poster card__poster--placeholder" />
                )}
                {event.group && <div className="caption">{event.group.name}</div>}
                <div className="card__title">{event.title}</div>
                <div className="card__description">{event.description}</div>
                <div className="caption">
                  {formatDate(event.date)}
                  {event.location ? ` · ${event.location}` : ''}
                </div>
                {typeof attendeeCount === 'number' && (
                  <div className="caption">
                    {attendeeCount} {attendeeCount === 1 ? 'person' : 'people'} interested
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
