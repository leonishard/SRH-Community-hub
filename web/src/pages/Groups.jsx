import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { listGroups, joinGroup, leaveGroup } from '../api/groups';
import { listGroupProposals, submitGroupProposal, uploadGroupProposalImage } from '../api/groupProposals';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import '../components/Card.css';
import './Groups.css';

export function Groups() {
  const { isAuthenticated, student, refreshStudent } = useAuth();
  const [groups, setGroups] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalName, setProposalName] = useState('');
  const [proposalCategory, setProposalCategory] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalProfilePicture, setProposalProfilePicture] = useState(null);
  const [proposalCoverImage, setProposalCoverImage] = useState(null);
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
  const myManagedGroups = student?.managedGroups || [];
  // Once approved, a proposal has become a real Group (see myManagedGroups above) —
  // it no longer belongs in the pending/rejected proposals list.
  const openProposals = proposals.filter((p) => p.status !== 'approved');

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

  function resetProposalForm() {
    setProposalName('');
    setProposalCategory('');
    setProposalDescription('');
    setProposalProfilePicture(null);
    setProposalCoverImage(null);
  }

  async function handleSubmitProposal(e) {
    e.preventDefault();
    setSubmittingProposal(true);
    setProposalNotice(null);
    try {
      const [uploadedProfilePicture, uploadedCoverImage] = await Promise.all([
        proposalProfilePicture ? uploadGroupProposalImage(proposalProfilePicture) : null,
        proposalCoverImage ? uploadGroupProposalImage(proposalCoverImage) : null,
      ]);
      await submitGroupProposal({
        name: proposalName,
        category: proposalCategory,
        description: proposalDescription,
        profilePicture: uploadedProfilePicture?.id,
        coverImage: uploadedCoverImage?.id,
      });
      resetProposalForm();
      setProposalNotice('Proposal submitted — a Coordinator will review it.');
      setShowProposalForm(false);
      await loadProposals();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingProposal(false);
    }
  }

  return (
    <div>
      <div className="groups-header">
        <div>
          <h1>Groups</h1>
          <p className="caption" style={{ marginTop: '0.5rem' }}>
            Every group in the Ambassador Hub.
          </p>
        </div>
        {isAuthenticated && (
          <Button onClick={() => setShowProposalForm((v) => !v)}>
            {showProposalForm ? 'CANCEL' : '+ NEW GROUP'}
          </Button>
        )}
      </div>

      {showProposalForm && (
        <section className="groups-proposal-form">
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
            />

            <label className="caption" htmlFor="proposal-category">
              CATEGORY
            </label>
            <input
              id="proposal-category"
              value={proposalCategory}
              onChange={(e) => setProposalCategory(e.target.value)}
              placeholder="e.g. Technology, Arts, Outdoors"
            />

            <label className="caption" htmlFor="proposal-description">
              DESCRIPTION
            </label>
            <textarea
              id="proposal-description"
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              rows={3}
            />

            <label className="caption" htmlFor="proposal-profile-picture">
              PROFILE PICTURE
            </label>
            <input
              id="proposal-profile-picture"
              type="file"
              accept="image/*"
              onChange={(e) => setProposalProfilePicture(e.target.files?.[0] || null)}
            />

            <label className="caption" htmlFor="proposal-cover-image">
              COVER IMAGE (BANNER)
            </label>
            <input
              id="proposal-cover-image"
              type="file"
              accept="image/*"
              onChange={(e) => setProposalCoverImage(e.target.files?.[0] || null)}
            />

            <Button type="submit" disabled={submittingProposal}>
              {submittingProposal ? 'SUBMITTING…' : 'SUBMIT PROPOSAL'}
            </Button>
          </form>
        </section>
      )}
      {proposalNotice && <p className="caption" style={{ marginTop: '1rem' }}>{proposalNotice}</p>}

      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}
      {loading && <p className="caption">Loading groups…</p>}

      {!loading && !error && (
        <div className="card-grid">
          {groups.map((group) => {
            const isMember = myGroupIds.has(group.documentId);
            const thumbUrl = group.profilePicture?.url ? `${API_URL}${group.profilePicture.url}` : null;
            return (
              <div className="card" key={group.documentId}>
                <Link to={`/groups/${group.documentId}`} className="card__link">
                  <div className="card__thumb-row">
                    {thumbUrl ? (
                      <img className="card__thumb" src={thumbUrl} alt="" />
                    ) : (
                      <div className="card__thumb card__thumb--placeholder" />
                    )}
                    <div className="card__title">{group.name}</div>
                  </div>
                  <div className="card__meta caption">
                    {group.category}
                    {group.members ? ` · ${group.members.length} member${group.members.length === 1 ? '' : 's'}` : ''}
                  </div>
                  <div className="card__description">{group.description}</div>
                </Link>
                {group.manager && (
                  <div className="caption">
                    Managed by <Link to={`/students/${group.manager.documentId}`}>{group.manager.name}</Link>
                  </div>
                )}
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

      {isAuthenticated && myManagedGroups.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2 className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ash-fg)', letterSpacing: '0.06em' }}>
            MY GROUPS
          </h2>
          {myManagedGroups.map((group) => (
            <Link
              to={`/groups/${group.documentId}`}
              key={group.documentId}
              className="groups-list-row"
            >
              <span>{group.name}</span>
              <span className="caption">MANAGER</span>
            </Link>
          ))}
        </section>
      )}

      {isAuthenticated && openProposals.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2 className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ash-fg)', letterSpacing: '0.06em' }}>
            YOUR PROPOSALS
          </h2>
          {openProposals.map((proposal) => (
            <div className="groups-list-row" key={proposal.documentId}>
              <span>{proposal.name}</span>
              <StatusTag status={proposal.status} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
