import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { listEvents } from '../api/events';
import { StatusTag } from '../components/StatusTag';
import { EventDateBadge } from '../components/EventDateBadge';
import '../components/Card.css';
import './Events.css';

const EMPTY_FILTERS = { group: '', host: '', category: '' };

export function Events() {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortOrder, setSortOrder] = useState('asc');
  const [timeScope, setTimeScope] = useState('all');

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

  const filteredEvents = events
    .filter((event) => {
      if (filters.group && event.group?.documentId !== filters.group) return false;
      if (filters.host && event.submittedBy?.documentId !== filters.host) return false;
      if (filters.category && event.category !== filters.category) return false;
      if (timeScope === 'upcoming' && new Date(event.date) < new Date()) return false;
      return true;
    })
    .sort((a, b) => (sortOrder === 'asc' ? 1 : -1) * (new Date(a.date) - new Date(b.date)));

  const hasActiveFilters = Object.values(filters).some(Boolean);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <h1>{t.events.title}</h1>
      <p className="caption" style={{ marginTop: '0.5rem' }}>
        {t.events.subtitle}
      </p>

      {!loading && !error && events.length > 0 && (
        <div className="events-filter-bar">
          <select value={filters.group} onChange={(e) => updateFilter('group', e.target.value)}>
            <option value="">{t.events.allGroups}</option>
            {groupOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <select value={filters.host} onChange={(e) => updateFilter('host', e.target.value)}>
            <option value="">{t.events.allHosts}</option>
            {hostOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          {categoryOptions.length > 0 && (
            <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
              <option value="">{t.events.allCategories}</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          )}

          <select value={timeScope} onChange={(e) => setTimeScope(e.target.value)}>
            <option value="all">{t.events.allTime}</option>
            <option value="upcoming">{t.events.upcomingOnly}</option>
          </select>

          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="asc">{t.events.soonestFirst}</option>
            <option value="desc">{t.events.latestFirst}</option>
          </select>

          {hasActiveFilters && (
            <button type="button" className="link-button caption" onClick={() => setFilters(EMPTY_FILTERS)}>
              {t.events.clearFilters}
            </button>
          )}
        </div>
      )}

      {loading && <p className="caption">{t.events.loading}</p>}
      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {!loading && !error && events.length === 0 && <p className="caption">{t.events.none}</p>}

      {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
        <p className="caption" style={{ marginTop: '1.5rem' }}>{t.events.noneMatch}</p>
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
                <EventDateBadge iso={event.date} />
                <div className="card__title">{event.title}</div>
                <div className="card__meta">
                  {event.status !== 'approved' && <StatusTag status={event.status} />}
                  {event.category && <span className="caption">{event.category}</span>}
                  {event.group && <span className="caption">{event.group.name}</span>}
                </div>
                <div className="card__description">{event.description}</div>
                {event.location && <div className="caption">{event.location}</div>}
                {event.submittedBy && <div className="caption">{t.events.hostedBy} {event.submittedBy.name}</div>}
                {typeof attendeeCount === 'number' && (
                  <div className="caption">{t.events.interested(attendeeCount)}</div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
