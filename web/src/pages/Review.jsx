import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listEvents, reviewEvent } from '../api/events';
import { listGroupProposals, reviewGroupProposal } from '../api/groupProposals';
import { Button } from '../components/Button';
import '../components/Card.css';

export function Review() {
  const { roleType } = useAuth();
  const [events, setEvents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const isCoordinator = roleType === 'coordinator';

  async function load() {
    setLoading(true);
    try {
      const [pendingEvents, pendingProposals] = await Promise.all([
        listEvents({ 'filters[status][$eq]': 'pending' }),
        listGroupProposals({ 'filters[status][$eq]': 'pending' }),
      ]);
      setEvents(pendingEvents);
      setProposals(pendingProposals);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isCoordinator) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoordinator]);

  if (!isCoordinator) {
    return (
      <div>
        <h1>Review</h1>
        <p className="caption" style={{ marginTop: '0.5rem' }}>
          Only Coordinators can review pending Events and Group Proposals.
        </p>
      </div>
    );
  }

  async function handleEventDecision(documentId, status) {
    setPendingId(documentId);
    try {
      await reviewEvent(documentId, status);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  async function handleProposalDecision(documentId, status) {
    setPendingId(documentId);
    try {
      await reviewGroupProposal(documentId, status);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <h1>Review</h1>
      <p className="caption" style={{ marginTop: '0.5rem' }}>
        Pending Events and Group Proposals awaiting a decision.
      </p>

      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}
      {loading && <p className="caption">Loading…</p>}

      {!loading && (
        <>
          <h2 style={{ marginTop: '2rem' }}>Group Proposals</h2>
          {proposals.length === 0 && <p className="caption">Nothing pending.</p>}
          <div className="card-grid">
            {proposals.map((proposal) => (
              <div className="card" key={proposal.documentId}>
                <div className="card__title">{proposal.name}</div>
                <div className="card__description">{proposal.description}</div>
                {proposal.submittedBy && <div className="caption">Submitted by {proposal.submittedBy.name}</div>}
                <div className="card__footer">
                  <Button
                    disabled={pendingId === proposal.documentId}
                    onClick={() => handleProposalDecision(proposal.documentId, 'approved')}
                  >
                    APPROVE
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pendingId === proposal.documentId}
                    onClick={() => handleProposalDecision(proposal.documentId, 'rejected')}
                  >
                    REJECT
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: '2rem' }}>Events</h2>
          {events.length === 0 && <p className="caption">Nothing pending.</p>}
          <div className="card-grid">
            {events.map((event) => (
              <div className="card" key={event.documentId}>
                <div className="card__title">{event.title}</div>
                <div className="card__meta caption">{event.group?.name}</div>
                <div className="card__description">{event.description}</div>
                {event.submittedBy && <div className="caption">Submitted by {event.submittedBy.name}</div>}
                <div className="card__footer">
                  <Button
                    disabled={pendingId === event.documentId}
                    onClick={() => handleEventDecision(event.documentId, 'approved')}
                  >
                    APPROVE
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pendingId === event.documentId}
                    onClick={() => handleEventDecision(event.documentId, 'rejected')}
                  >
                    REJECT
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
