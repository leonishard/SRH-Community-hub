import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { listGroups, joinGroup, leaveGroup } from '../api/groups';
import { listGroupProposals, submitGroupProposal, uploadGroupProposalImage } from '../api/groupProposals';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import '../components/Card.css';
import './Groups.css';

export function Groups() {
  const { isAuthenticated, student, refreshStudent } = useAuth();
  const { t } = useLanguage();
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
  const [proposalMemberLimit, setProposalMemberLimit] = useState('');
  const [proposalResponsibleEmail, setProposalResponsibleEmail] = useState('');
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
    setProposalMemberLimit('');
    setProposalResponsibleEmail('');
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
        memberLimit: proposalMemberLimit ? Number(proposalMemberLimit) : undefined,
        responsibleEmail: proposalResponsibleEmail || undefined,
      });
      resetProposalForm();
      setProposalNotice(t.groups.proposalSubmitted);
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
          <h1>{t.groups.title}</h1>
          <p className="caption" style={{ marginTop: '0.5rem' }}>
            {t.groups.subtitle}
          </p>
        </div>
        {isAuthenticated && (
          <Button onClick={() => setShowProposalForm((v) => !v)}>
            {showProposalForm ? t.groups.cancel : t.groups.newGroup}
          </Button>
        )}
      </div>

      {showProposalForm && (
        <section className="groups-proposal-form">
          <h2>{t.groups.proposeTitle}</h2>
          <form onSubmit={handleSubmitProposal} style={{ marginTop: '1rem', maxWidth: '480px' }}>
            <label className="caption" htmlFor="proposal-name">
              {t.groups.name}
            </label>
            <input
              id="proposal-name"
              value={proposalName}
              onChange={(e) => setProposalName(e.target.value)}
              required
            />

            <label className="caption" htmlFor="proposal-category">
              {t.groups.category}
            </label>
            <input
              id="proposal-category"
              value={proposalCategory}
              onChange={(e) => setProposalCategory(e.target.value)}
              placeholder={t.groups.categoryPlaceholder}
            />

            <label className="caption" htmlFor="proposal-description">
              {t.groups.description}
            </label>
            <textarea
              id="proposal-description"
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              rows={3}
            />

            <label className="caption" htmlFor="proposal-member-limit">
              {t.groups.memberLimit}
            </label>
            <input
              id="proposal-member-limit"
              type="number"
              min="1"
              value={proposalMemberLimit}
              onChange={(e) => setProposalMemberLimit(e.target.value)}
              placeholder={t.groups.memberLimitPlaceholder}
            />

            <label className="caption" htmlFor="proposal-responsible-email">
              {t.groups.responsibleEmail}
            </label>
            <input
              id="proposal-responsible-email"
              type="email"
              value={proposalResponsibleEmail}
              onChange={(e) => setProposalResponsibleEmail(e.target.value)}
              placeholder={t.groups.responsibleEmailPlaceholder}
            />

            <label className="caption" htmlFor="proposal-profile-picture">
              {t.groups.profilePicture}
            </label>
            <input
              id="proposal-profile-picture"
              type="file"
              accept="image/*"
              onChange={(e) => setProposalProfilePicture(e.target.files?.[0] || null)}
            />

            <label className="caption" htmlFor="proposal-cover-image">
              {t.groups.coverImage}
            </label>
            <input
              id="proposal-cover-image"
              type="file"
              accept="image/*"
              onChange={(e) => setProposalCoverImage(e.target.files?.[0] || null)}
            />

            <Button type="submit" disabled={submittingProposal}>
              {submittingProposal ? t.groups.submitting : t.groups.submit}
            </Button>
          </form>
        </section>
      )}
      {proposalNotice && <p className="caption" style={{ marginTop: '1rem' }}>{proposalNotice}</p>}

      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}
      {loading && <p className="caption">{t.groups.loading}</p>}

      {!loading && !error && (
        <div className="card-grid">
          {groups.map((group) => {
            const isMember = myGroupIds.has(group.documentId);
            const isFull = Boolean(group.memberLimit) && (group.members?.length || 0) >= group.memberLimit && !isMember;
            const bannerUrl = group.coverImage?.url
              ? `${API_URL}${group.coverImage.url}`
              : group.profilePicture?.url
                ? `${API_URL}${group.profilePicture.url}`
                : null;
            return (
              <div className="card" key={group.documentId}>
                <Link to={`/groups/${group.documentId}`} className="card__link">
                  {bannerUrl ? (
                    <img className="card__poster" src={bannerUrl} alt="" />
                  ) : (
                    <div className="card__poster card__poster--placeholder" />
                  )}
                  <div className="card__title">{group.name}</div>
                  <div className="card__meta caption">
                    {group.category}
                    {group.members ? t.card.member(group.members.length, group.memberLimit) : ''}
                  </div>
                  <div className="card__description">{group.description}</div>
                </Link>
                {group.manager && (
                  <div className="caption">
                    {t.groups.managedBy} <Link to={`/students/${group.manager.documentId}`}>{group.manager.name}</Link>
                  </div>
                )}
                {isAuthenticated && (
                  <div className="card__footer">
                    <Button
                      variant={isMember ? 'outline' : 'primary'}
                      disabled={pendingId === group.documentId || isFull}
                      onClick={() => handleToggleMembership(group)}
                    >
                      {isMember ? t.groups.leave : isFull ? t.groups.groupFull : t.groups.join}
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
            {t.groups.myGroupsHeader}
          </h2>
          {myManagedGroups.map((group) => (
            <Link
              to={`/groups/${group.documentId}`}
              key={group.documentId}
              className="groups-list-row"
            >
              <span>{group.name}</span>
              <span className="caption">{t.groups.manager}</span>
            </Link>
          ))}
        </section>
      )}

      {isAuthenticated && openProposals.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2 className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ash-fg)', letterSpacing: '0.06em' }}>
            {t.groups.yourProposalsHeader}
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
