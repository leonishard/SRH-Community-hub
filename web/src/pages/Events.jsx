import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { listEvents } from '../api/events';
import '../components/Card.css';
import './Events.css';

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EMPTY_FILTERS = { group: '', host: '', category: '', dateFrom: '', dateTo: '' };

export function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const groupOptions = useMemo(() => {
    const map = new Map();
    events.forEach((e) => e.group && map.set(e.group.documentId, e.group.name));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const hostOptions = useMemo(() => {
    const map = new Map();
    events.forEach((e) => e.submittedBy && map.set(e.submittedBy.documentId, e.submittedBy.name));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    events.forEach((e) => e.category && set.add(e.category));
    return [...set].sort();
  }, [events]);

  const filteredEvents = events.filter((event) => {
    if (filters.group && event.group?.documentId !== filters.group) return false;
    if (filters.host && event.submittedBy?.documentId !== filters.host) return false;
    if (filters.category && event.category !== filters.category) return false;
    if (filters.dateFrom && new Date(event.date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(event.date) > new Date(`${filters.dateTo}T23:59:59`)) return false;
    return true;
  });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <h1>Events</h1>
      <p className="caption" style={{ marginTop: '0.5rem' }}>
        Approved events across every group. Signed-in Group Managers and Coordinators also see
        pending submissions for groups they manage.
      </p>

      {!loading && !error && events.length > 0 && (
        <div className="events-filter-bar">
          <select value={filters.group} onChange={(e) => updateFilter('group', e.target.value)}>
            <option value="">All groups</option>
            {groupOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <select value={filters.host} onChange={(e) => updateFilter('host', e.target.value)}>
            <option value="">All hosts</option>
            {hostOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          {categoryOptions.length > 0 && (
            <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          )}

          <label className="events-filter-bar__date-label caption">
            FROM
            <input type="date" value={filters.dateFrom} onChange={(e) => updateFilter('dateFrom', e.target.value)} />
          </label>

          <label className="events-filter-bar__date-label caption">
            TO
            <input type="date" value={filters.dateTo} onChange={(e) => updateFilter('dateTo', e.target.value)} />
          </label>

          {hasActiveFilters && (
            <button type="button" className="link-button caption" onClick={() => setFilters(EMPTY_FILTERS)}>
              CLEAR FILTERS
            </button>
          )}
        </div>
      )}

      {loading && <p className="caption">Loading events…</p>}
      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {!loading && !error && events.length === 0 && <p className="caption">No events yet.</p>}

      {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
        <p className="caption" style={{ marginTop: '1.5rem' }}>No events match these filters.</p>
      )}

      {!loading && !error && filteredEvents.length > 0 && (
        <div className="card-grid">
          {filteredEvents.map((event) => {
            const posterUrl = event.poster?.url ? `${API_URL}${event.poster.url}` : null;
            const attendeeCount = event.attendees?.length;
            return (
              <Link to={`/events/${event.documentId}`} className="card card__link" key={event.documentId}>
                {posterUrl ? (
                  <img className="card__poster" src={posterUrl} alt="" />
                ) : (
                  <div className="card__poster card__poster--placeholder" />
                )}
                <div className="card__meta">
                  {event.category && <span className="caption">{event.category}</span>}
                  {event.group && <span className="caption">{event.group.name}</span>}
                </div>
                <div className="card__title">{event.title}</div>
                <div className="card__description">{event.description}</div>
                <div className="caption">
                  {formatDate(event.date)}
                  {event.location ? ` · ${event.location}` : ''}
                </div>
                {event.submittedBy && <div className="caption">Hosted by {event.submittedBy.name}</div>}
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
