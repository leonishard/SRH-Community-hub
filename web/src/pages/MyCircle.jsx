import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listEvents } from '../api/events';
import { listPosts } from '../api/posts';
import { listFriendships } from '../api/friendships';
import { buildLedgerEntries } from '../utils/activity';
import { LedgerEntry } from '../components/LedgerEntry';
import './MyCircle.css';

function formatEventDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

function formatEventTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function MyCircle() {
  const { student } = useAuth();
  const [entries, setEntries] = useState([]);
  const [events, setEvents] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const myGroupIds = useMemo(() => new Set((student?.groups || []).map((g) => g.documentId)), [student]);

  useEffect(() => {
    if (!student) return;

    setLoading(true);
    Promise.all([listEvents(), listPosts(), listFriendships()])
      .then(([fetchedEvents, posts, fetchedFriendships]) => {
        setEvents(fetchedEvents);
        setFriendships(fetchedFriendships);
        setEntries(
          buildLedgerEntries({ student, myGroupIds, events: fetchedEvents, posts, friendships: fetchedFriendships })
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student]);

  const myGroups = student?.groups || [];

  const acceptedFriendsCount = friendships.filter(
    (f) =>
      f.status === 'accepted' &&
      (f.requester?.documentId === student?.documentId || f.addressee?.documentId === student?.documentId)
  ).length;

  const upcomingEvents = events
    .filter((e) => e.status === 'approved' && myGroupIds.has(e.group?.documentId) && new Date(e.date) > new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);

  const attendingEvents = events
    .filter(
      (e) =>
        new Date(e.date) > new Date() &&
        (e.attendees || []).some((attendee) => attendee.documentId === student?.documentId)
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="my-circle">
      <header className="my-circle__header">
        <h1>My Circle</h1>
      </header>

      {!loading && !error && (
        <section className="my-circle__stats">
          <div className="stat-card">
            <div className="stat-card__value mono">{myGroups.length}</div>
            <div className="stat-card__label caption">Groups followed</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value mono">{acceptedFriendsCount}</div>
            <div className="stat-card__label caption">Accepted friends</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value mono">{upcomingEvents.length}</div>
            <div className="stat-card__label caption">Upcoming events</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value mono">{attendingEvents.length}</div>
            <div className="stat-card__label caption">Events attending</div>
          </div>
        </section>
      )}

      <section className="my-circle__upcoming">
        <h2 className="my-circle__section-title mono">UPCOMING EVENTS</h2>

        {loading && <p className="caption">Loading…</p>}
        {error && <p className="caption my-circle__error">{error}</p>}

        {!loading && !error && upcomingEvents.length === 0 && (
          <p className="caption">No upcoming events — explore new groups to discover more.</p>
        )}

        {!loading && !error && upcomingEvents.length > 0 && (
          <div className="my-circle__event-list">
            {upcomingEvents.map((event) => (
              <Link to={`/groups/${event.group.documentId}`} className="event-row" key={event.documentId}>
                <div className="event-row__date mono">
                  <span>{formatEventDate(event.date)}</span>
                  <span className="event-row__time">{formatEventTime(event.date)}</span>
                </div>
                <div className="event-row__body">
                  <div className="event-row__title">{event.title}</div>
                  <div className="caption">
                    {event.group.name}
                    {event.location ? ` · ${event.location}` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="my-circle__upcoming">
        <h2 className="my-circle__section-title mono">EVENTS YOU'RE ATTENDING</h2>

        {!loading && !error && attendingEvents.length === 0 && (
          <p className="caption">You haven't RSVP'd to any upcoming events yet.</p>
        )}

        {!loading && !error && attendingEvents.length > 0 && (
          <div className="my-circle__event-list">
            {attendingEvents.map((event) => (
              <Link to={`/events/${event.documentId}`} className="event-row" key={event.documentId}>
                <div className="event-row__date mono">
                  <span>{formatEventDate(event.date)}</span>
                  <span className="event-row__time">{formatEventTime(event.date)}</span>
                </div>
                <div className="event-row__body">
                  <div className="event-row__title">{event.title}</div>
                  <div className="caption">
                    {event.group?.name}
                    {event.location ? ` · ${event.location}` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="my-circle__activity">
        <h2 className="my-circle__section-title mono">ACTIVITY</h2>

        {loading && <p className="caption">Loading activity…</p>}
        {error && <p className="caption my-circle__error">{error}</p>}

        {!loading && !error && entries.length === 0 && (
          <p className="caption">No activity yet in your groups. Join one from Discover to see it here.</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="my-circle__ledger">
            {entries.map((entry) => (
              <LedgerEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
