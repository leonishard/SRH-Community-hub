import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listEvents, reviewEvent } from '../api/events';
import { listGroupProposals, reviewGroupProposal } from '../api/groupProposals';
import { listGroups, updateGroup, deleteGroup } from '../api/groups';
import { listStudents } from '../api/students';
import { Button } from '../components/Button';
import { Toast } from '../components/Toast';
import '../components/Card.css';
import './Review.css';

function GroupManagerRow({ group, students, onChanged, showToast, setError }) {
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const currentManagerId = group.manager?.documentId || '';

  async function handleChange(e) {
    const newManagerId = e.target.value;
    setPending(true);
    try {
      await updateGroup(group.documentId, { manager: newManagerId || null });
      const newManagerName = newManagerId ? students.find((s) => s.documentId === newManagerId)?.name : null;
      showToast(
        newManagerName
          ? `${newManagerName} is now managing ${group.name}.`
          : `${group.name} no longer has a manager.`
      );
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    try {
      await deleteGroup(group.documentId);
      showToast(`${group.name} was deleted.`);
      await onChanged();
    } catch (err) {
      setError(err.message);
      setPending(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="review-manager-row">
      <div>
        <div className="review-manager-row__name">{group.name}</div>
        <div className="caption">{group.category}</div>
      </div>
      <div className="review-manager-row__actions">
        <select value={currentManagerId} onChange={handleChange} disabled={pending}>
          <option value="">— No manager —</option>
          {students.map((s) => (
            <option key={s.documentId} value={s.documentId}>
              {s.name}
            </option>
          ))}
        </select>
        {confirmingDelete ? (
          <>
            <button type="button" className="link-button caption" disabled={pending} onClick={() => setConfirmingDelete(false)}>
              CANCEL
            </button>
            <Button variant="danger" disabled={pending} onClick={handleDelete}>
              CONFIRM
            </Button>
          </>
        ) : (
          <Button variant="danger" disabled={pending} onClick={() => setConfirmingDelete(true)}>
            DELETE
          </Button>
        )}
      </div>
    </div>
  );
}

export function Review() {
  const { roleType } = useAuth();
  const [events, setEvents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [toast, setToast] = useState(null);

  const isCoordinator = roleType === 'coordinator';

  async function load() {
    setLoading(true);
    try {
      const [pendingEvents, pendingProposals, allGroups, allStudents] = await Promise.all([
        listEvents({ 'filters[status][$eq]': 'pending' }),
        listGroupProposals({ 'filters[status][$eq]': 'pending' }),
        listGroups({ populate: 'manager' }),
        listStudents(),
      ]);
      setEvents(pendingEvents);
      setProposals(pendingProposals);
      setGroups(allGroups);
      setStudents([...allStudents].sort((a, b) => a.name.localeCompare(b.name)));
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

  function showToast(message) {
    setToast(message);
  }

  async function handleEventDecision(event, status) {
    setPendingId(event.documentId);
    try {
      await reviewEvent(event.documentId, status);
      showToast(`${event.title} ${status}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  async function handleProposalDecision(proposal, status) {
    setPendingId(proposal.documentId);
    try {
      await reviewGroupProposal(proposal.documentId, status);
      showToast(
        status === 'approved'
          ? `${proposal.name} approved — ${proposal.submittedBy?.name || 'the submitter'} is now its manager.`
          : `${proposal.name} rejected.`
      );
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
        Pending Events and Group Proposals awaiting a decision, plus who manages each group.
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
                {proposal.submittedBy && (
                  <div className="caption">
                    Submitted by <Link to={`/students/${proposal.submittedBy.documentId}`}>{proposal.submittedBy.name}</Link>
                  </div>
                )}
                <div className="card__footer">
                  <Button
                    disabled={pendingId === proposal.documentId}
                    onClick={() => handleProposalDecision(proposal, 'approved')}
                  >
                    APPROVE
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pendingId === proposal.documentId}
                    onClick={() => handleProposalDecision(proposal, 'rejected')}
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
                {event.submittedBy && (
                  <div className="caption">
                    Submitted by <Link to={`/students/${event.submittedBy.documentId}`}>{event.submittedBy.name}</Link>
                  </div>
                )}
                <div className="card__footer">
                  <Button
                    disabled={pendingId === event.documentId}
                    onClick={() => handleEventDecision(event, 'approved')}
                  >
                    APPROVE
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pendingId === event.documentId}
                    onClick={() => handleEventDecision(event, 'rejected')}
                  >
                    REJECT
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: '2rem' }}>Manage Groups</h2>
          <p className="caption" style={{ marginTop: '0.35rem' }}>
            Reassign or remove a group's manager — changing this updates their permissions immediately —
            or delete a group entirely.
          </p>
          <div className="review-manager-list">
            {groups.map((group) => (
              <GroupManagerRow
                key={group.documentId}
                group={group}
                students={students}
                onChanged={load}
                showToast={showToast}
                setError={setError}
              />
            ))}
          </div>
        </>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
