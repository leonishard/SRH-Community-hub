import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getEvent, attendEvent, unattendEvent } from '../api/events';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import '../components/Card.css';
import './Friends.css';
import './GroupDetail.css';
import './EventDetail.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function EventDetail() {
  const { documentId } = useParams();
  const { isAuthenticated, student } = useAuth();
  const { t } = useLanguage();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rsvpPending, setRsvpPending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getEvent(documentId);
      setEvent(data);
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
    return <p className="caption">{t.eventDetail.loading}</p>;
  }

  if (error || !event) {
    return (
      <div>
        <h1>{t.eventDetail.notFound}</h1>
        {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}
        <p className="caption" style={{ marginTop: '0.5rem' }}>
          <Link to="/events">{t.eventDetail.backToEvents}</Link>
        </p>
      </div>
    );
  }

  const posterUrl = event.poster?.url ? `${API_URL}${event.poster.url}` : null;
  const attendees = event.attendees || [];
  const isAttending = attendees.some((a) => a.documentId === student?.documentId);

  async function handleToggleRsvp() {
    setRsvpPending(true);
    try {
      if (isAttending) {
        await unattendEvent(documentId);
      } else {
        await attendEvent(documentId);
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRsvpPending(false);
    }
  }

  return (
    <div>
      <p className="caption">
        <Link to="/events">{t.eventDetail.backToEvents}</Link>
      </p>

      <div className="group-detail__cover event-detail__poster">
        {posterUrl ? <img src={posterUrl} alt="" /> : <div className="group-detail__cover-placeholder" />}
      </div>

      <div className="group-detail__header">
        <div>
          <div className="card__meta" style={{ marginBottom: '0.5rem' }}>
            {event.status !== 'approved' && <StatusTag status={event.status} />}
            {event.category && <span className="caption">{event.category}</span>}
            {event.group && (
              <span className="caption">
                <Link to={`/groups/${event.group.documentId}`}>{event.group.name}</Link>
              </span>
            )}
          </div>
          <h1>{event.title}</h1>
          <div className="caption" style={{ marginTop: '0.5rem' }}>
            {formatDate(event.date)} · {formatTime(event.date)}
            {event.location ? ` · ${event.location}` : ''}
          </div>
          {event.submittedBy && (
            <div className="caption" style={{ marginTop: '0.25rem' }}>
              {t.eventDetail.hostedBy} <Link to={`/students/${event.submittedBy.documentId}`}>{event.submittedBy.name}</Link>
            </div>
          )}
        </div>
        <div className="group-detail__header-actions">
          {isAuthenticated ? (
            <Button variant={isAttending ? 'outline' : 'primary'} disabled={rsvpPending} onClick={handleToggleRsvp}>
              {isAttending ? t.eventDetail.cancelRsvp : t.eventDetail.imAttending}
            </Button>
          ) : (
            <Link to="/login" className="caption">
              {t.eventDetail.signInToRsvp}
            </Link>
          )}
        </div>
      </div>

      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      <p style={{ marginTop: '1.5rem' }}>{event.description}</p>

      <section style={{ marginTop: '3rem' }}>
        <h2 className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ash-fg)', letterSpacing: '0.06em' }}>
          {t.eventDetail.interestedHeader(attendees.length)}
        </h2>
        {attendees.length === 0 && <p className="caption" style={{ marginTop: '0.5rem' }}>{t.eventDetail.noRsvps}</p>}
        {attendees.length > 0 && (
          <div className="event-detail__attendees">
            {attendees.map((attendee) => (
              <Link to={`/students/${attendee.documentId}`} className="friends-row" key={attendee.documentId}>
                <span>{attendee.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
