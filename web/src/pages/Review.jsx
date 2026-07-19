import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { listEvents, reviewEvent } from '../api/events';
import { listGroupProposals, reviewGroupProposal } from '../api/groupProposals';
import { listGroups, updateGroup, deleteGroup } from '../api/groups';
import { listStudents } from '../api/students';
import { Button } from '../components/Button';
import { Toast } from '../components/Toast';
import '../components/Card.css';
import './Review.css';

function GroupManagerRow({ group, students, onChanged, showToast, setError, t }) {
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
        newManagerName ? t.review.managerAssigned(newManagerName, group.name) : t.review.managerRemoved(group.name)
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
      showToast(t.review.groupDeleted(group.name));
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
          <option value="">{t.review.noManager}</option>
          {students.map((s) => (
            <option key={s.documentId} value={s.documentId}>
              {s.name}
            </option>
          ))}
        </select>
        {confirmingDelete ? (
          <>
            <button type="button" className="link-button caption" disabled={pending} onClick={() => setConfirmingDelete(false)}>
              {t.review.cancel}
            </button>
            <Button variant="danger" disabled={pending} onClick={handleDelete}>
              {t.review.confirm}
            </Button>
          </>
        ) : (
          <Button variant="danger" disabled={pending} onClick={() => setConfirmingDelete(true)}>
            {t.review.delete}
          </Button>
        )}
      </div>
    </div>
  );
}

export function Review() {
  const { roleType } = useAuth();
  const { t } = useLanguage();
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
        <h1>{t.review.title}</h1>
        <p className="caption" style={{ marginTop: '0.5rem' }}>
          {t.review.notCoordinator}
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
      showToast(t.review.eventDecided(event.title, status));
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
          ? t.review.proposalApproved(proposal.name, proposal.submittedBy?.name || t.review.theSubmitter)
          : t.review.proposalRejected(proposal.name)
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
      <h1>{t.review.title}</h1>
      <p className="caption" style={{ marginTop: '0.5rem' }}>
        {t.review.subtitle}
      </p>

      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}
      {loading && <p className="caption">{t.review.loading}</p>}

      {!loading && (
        <>
          <h2 style={{ marginTop: '2rem' }}>{t.review.groupProposalsHeader}</h2>
          {proposals.length === 0 && <p className="caption">{t.review.nothingPending}</p>}
          <div className="card-grid">
            {proposals.map((proposal) => (
              <div className="card" key={proposal.documentId}>
                <div className="card__title">{proposal.name}</div>
                <div className="card__description">{proposal.description}</div>
                {proposal.submittedBy && (
                  <div className="caption">
                    {t.review.submittedBy} <Link to={`/students/${proposal.submittedBy.documentId}`}>{proposal.submittedBy.name}</Link>
                  </div>
                )}
                <div className="card__footer">
                  <Button
                    disabled={pendingId === proposal.documentId}
                    onClick={() => handleProposalDecision(proposal, 'approved')}
                  >
                    {t.review.approve}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pendingId === proposal.documentId}
                    onClick={() => handleProposalDecision(proposal, 'rejected')}
                  >
                    {t.review.reject}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: '2rem' }}>{t.review.eventsHeader}</h2>
          {events.length === 0 && <p className="caption">{t.review.nothingPending}</p>}
          <div className="card-grid">
            {events.map((event) => (
              <div className="card" key={event.documentId}>
                <div className="card__title">{event.title}</div>
                <div className="card__meta caption">{event.group?.name}</div>
                <div className="card__description">{event.description}</div>
                {event.submittedBy && (
                  <div className="caption">
                    {t.review.submittedBy} <Link to={`/students/${event.submittedBy.documentId}`}>{event.submittedBy.name}</Link>
                  </div>
                )}
                <div className="card__footer">
                  <Button
                    disabled={pendingId === event.documentId}
                    onClick={() => handleEventDecision(event, 'approved')}
                  >
                    {t.review.approve}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pendingId === event.documentId}
                    onClick={() => handleEventDecision(event, 'rejected')}
                  >
                    {t.review.reject}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: '2rem' }}>{t.review.manageGroupsHeader}</h2>
          <p className="caption" style={{ marginTop: '0.35rem' }}>
            {t.review.manageGroupsSubtitle}
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
                t={t}
              />
            ))}
          </div>
        </>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
