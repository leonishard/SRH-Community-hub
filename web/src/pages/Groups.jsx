import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listGroups, joinGroup, leaveGroup } from '../api/groups';
import { listGroupProposals, submitGroupProposal } from '../api/groupProposals';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import '../components/Card.css';

export function Groups() {
  const { isAuthenticated, student, refreshStudent } = useAuth();
  const [groups, setGroups] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const [proposalName, setProposalName] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalNotice, setProposalNotice] = useState(null);

  async function loadGroups() {
    return listGroups().then(setGroups);
  }

  async function loadProposals() {
    if (!isAuthenticated) return;
    return listGroupProposals().then(setProposals);
  }

  useEffect(() => {
    Promise.all([loadGroups(), loadProposals()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const myGroupIds = new Set((student?.groups || []).map((g) => g.documentId));

  async function handleToggleMembership(group) {
    setPendingId(group.documentId);
    try {
      if (myGroupIds.has(group.documentId)) {
        await leaveGroup(group.documentId);
      } else {
        await joinGroup(group.documentId);
      }
      const [refreshedGroups] = await Promise.all([listGroups(), refreshStudent()]);
      setGroups(refreshedGroups);
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  async function handleSubmitProposal(e) {
    e.preventDefault();
    setSubmittingProposal(true);
    setProposalNotice(null);
    try {
      await submitGroupProposal({ name: proposalName, description: proposalDescription });
      setProposalName('');
      setProposalDescription('');
      setProposalNotice('Proposal submitted — a Coordinator will review it.');
      await loadProposals();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingProposal(false);
    }
  }

  return (
    <div>
      <h1>Groups</h1>
      <p className="caption" style={{ marginTop: '0.5rem' }}>
        Every group in the Ambassador Hub.
      </p>

      {loading && <p className="caption">Loading groups…</p>}
      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {!loading && !error && (
        <div className="card-grid">
          {groups.map((group) => {
            const isMember = myGroupIds.has(group.documentId);
            return (
              <div className="card" key={group.documentId}>
                <div className="card__title">{group.name}</div>
                <div className="card__meta caption">
                  {group.category}
                  {group.members ? ` · ${group.members.length} member${group.members.length === 1 ? '' : 's'}` : ''}
                </div>
                <div className="card__description">{group.description}</div>
                {group.manager && <div className="caption">Managed by {group.manager.name}</div>}
                {isAuthenticated && (
                  <div className="card__footer">
                    <Button
                      variant={isMember ? 'outline' : 'primary'}
                      disabled={pendingId === group.documentId}
                      onClick={() => handleToggleMembership(group)}
                    >
                      {isMember ? 'LEAVE' : 'JOIN'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAuthenticated && (
        <section style={{ marginTop: '3rem' }}>
          <h2>Propose a new group</h2>
          <form onSubmit={handleSubmitProposal} style={{ marginTop: '1rem', maxWidth: '480px' }}>
            <label className="caption" htmlFor="proposal-name">
              NAME
            </label>
            <input
              id="proposal-name"
              value={proposalName}
              onChange={(e) => setProposalName(e.target.value)}
              required
              style={{
                display: 'block',
                width: '100%',
                marginTop: '0.35rem',
                marginBottom: '1rem',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                background: 'transparent',
                color: 'var(--fg)',
                padding: '0.6rem 0.75rem',
              }}
            />
            <label className="caption" htmlFor="proposal-description">
              DESCRIPTION
            </label>
            <textarea
              id="proposal-description"
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              rows={3}
              style={{
                display: 'block',
                width: '100%',
                marginTop: '0.35rem',
                marginBottom: '1rem',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                background: 'transparent',
                color: 'var(--fg)',
                padding: '0.6rem 0.75rem',
                fontFamily: 'inherit',
              }}
            />
            <Button type="submit" disabled={submittingProposal}>
              {submittingProposal ? 'SUBMITTING…' : 'SUBMIT PROPOSAL'}
            </Button>
            {proposalNotice && <p className="caption" style={{ marginTop: '0.75rem' }}>{proposalNotice}</p>}
          </form>

          {proposals.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h2 className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ash-fg)', letterSpacing: '0.06em' }}>
                YOUR PROPOSALS
              </h2>
              {proposals.map((proposal) => (
                <div
                  key={proposal.documentId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <span>{proposal.name}</span>
                  <StatusTag status={proposal.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
