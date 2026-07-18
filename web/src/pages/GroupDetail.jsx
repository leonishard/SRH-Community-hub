import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroup, joinGroup, leaveGroup } from '../api/groups';
import { listEvents, submitEvent } from '../api/events';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import '../components/Card.css';
import './Friends.css';
import './GroupDetail.css';

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function GroupDetail() {
  const { documentId } = useParams();
  const { isAuthenticated, student, roleType, refreshStudent } = useAuth();
  const [group, setGroup] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [membershipPending, setMembershipPending] = useState(false);

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [eventNotice, setEventNotice] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [groupData, groupEvents] = await Promise.all([
        getGroup(documentId),
        listEvents({ 'filters[group][documentId][$eq]': documentId, 'sort[0]': 'date:asc' }),
      ]);
      setGroup(groupData);
      setEvents(groupEvents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (loading) {
    return <p className="caption">Loading…</p>;
  }

  if (error || !group) {
    return (
      <div>
        <h1>Group not found</h1>
        {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}
        <p className="caption" style={{ marginTop: '0.5rem' }}>
          <Link to="/groups">Back to Groups</Link>
        </p>
      </div>
    );
  }

  const isMember = (student?.groups || []).some((g) => g.documentId === documentId);
  const isManager = (student?.managedGroups || []).some((g) => g.documentId === documentId);
  const isCoordinator = roleType === 'coordinator';
  const canSubmitEvent = isManager || isCoordinator;

  const now = new Date();
  const approved = events.filter((e) => e.status === 'approved');
  const upcoming = approved.filter((e) => new Date(e.date) >= now);
  const past = approved.filter((e) => new Date(e.date) < now);
  const pending = events.filter((e) => e.status === 'pending');

  async function handleToggleMembership() {
    setMembershipPending(true);
    try {
      if (isMember) {
        await leaveGroup(documentId);
      } else {
        await joinGroup(documentId);
      }
      const [groupData] = await Promise.all([getGroup(documentId), refreshStudent()]);
      setGroup(groupData);
    } catch (err) {
      setError(err.message);
    } finally {
      setMembershipPending(false);
    }
  }

  async function handleSubmitEvent(e) {
    e.preventDefault();
    setSubmittingEvent(true);
    setEventNotice(null);
    try {
      await submitEvent({
        title: eventTitle,
        description: eventDescription,
        date: new Date(eventDate).toISOString(),
        location: eventLocation,
        group: documentId,
      });
      setEventTitle('');
      setEventDescription('');
      setEventDate('');
      setEventLocation('');
      setEventNotice('Event submitted — awaiting Coordinator approval.');
      setShowEventForm(false);
      const groupEvents = await listEvents({
        'filters[group][documentId][$eq]': documentId,
        'sort[0]': 'date:asc',
      });
      setEvents(groupEvents);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingEvent(false);
    }
  }

  return (
    <div>
      <p className="caption">
        <Link to="/groups">← Back to Groups</Link>
      </p>

      <div className="group-detail__header">
        <div>
          <h1>{group.name}</h1>
          <div className="card__meta caption" style={{ marginTop: '0.5rem' }}>
            {group.category}
            {group.members ? ` · ${group.members.length} member${group.members.length === 1 ? '' : 's'}` : ''}
          </div>
          {group.manager && (
            <div className="caption" style={{ marginTop: '0.25rem' }}>
              Managed by <Link to={`/students/${group.manager.documentId}`}>{group.manager.name}</Link>
            </div>
          )}
        </div>
        <div className="group-detail__header-actions">
          {canSubmitEvent && (
            <Button onClick={() => setShowEventForm((v) => !v)}>
              {showEventForm ? 'CANCEL' : '+ NEW EVENT'}
            </Button>
          )}
          {isAuthenticated && (
            <Button variant={isMember ? 'outline' : 'primary'} disabled={membershipPending} onClick={handleToggleMembership}>
              {isMember ? 'LEAVE' : 'JOIN'}
            </Button>
          )}
        </div>
      </div>

      <p style={{ marginTop: '1.5rem' }}>{group.description}</p>

      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {group.members && group.members.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2>Members</h2>
          {group.members.map((member) => (
            <Link to={`/students/${member.documentId}`} className="friends-row" key={member.documentId}>
              <span>{member.name}</span>
            </Link>
          ))}
        </section>
      )}

      {canSubmitEvent && showEventForm && (
        <section style={{ marginTop: '3rem' }}>
          <h2>Submit a new event</h2>
          <form onSubmit={handleSubmitEvent} className="group-detail__form">
            <label className="caption" htmlFor="event-title">TITLE</label>
            <input id="event-title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />

            <label className="caption" htmlFor="event-description">DESCRIPTION</label>
            <textarea
              id="event-description"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows={3}
            />

            <label className="caption" htmlFor="event-date">DATE &amp; TIME</label>
            <input
              id="event-date"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />

            <label className="caption" htmlFor="event-location">LOCATION</label>
            <input id="event-location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />

            <Button type="submit" disabled={submittingEvent}>
              {submittingEvent ? 'SUBMITTING…' : 'SUBMIT EVENT'}
            </Button>
          </form>
        </section>
      )}
      {eventNotice && <p className="caption" style={{ marginTop: '1rem' }}>{eventNotice}</p>}

      {canSubmitEvent && pending.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2 className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ash-fg)', letterSpacing: '0.06em' }}>
            AWAITING APPROVAL
          </h2>
          <div className="card-grid">
            {pending.map((event) => (
              <div className="card" key={event.documentId}>
                <div className="card__meta">
                  <StatusTag status={event.status} />
                </div>
                <div className="card__title">{event.title}</div>
                <div className="caption">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <section style={{ marginTop: '3rem' }}>
        <h2>Upcoming events</h2>
        {upcoming.length === 0 && <p className="caption">No upcoming events.</p>}
        <div className="card-grid">
          {upcoming.map((event) => (
            <div className="card" key={event.documentId}>
              <div className="card__title">{event.title}</div>
              <div className="card__description">{event.description}</div>
              <div className="caption">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2>Past events</h2>
        {past.length === 0 && <p className="caption">No past events yet.</p>}
        <div className="card-grid">
          {past.map((event) => (
            <div className="card" key={event.documentId}>
              <div className="card__title">{event.title}</div>
              <div className="card__description">{event.description}</div>
              <div className="caption">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
