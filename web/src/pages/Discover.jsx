import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { listGroups, joinGroup } from '../api/groups';
import { Button } from '../components/Button';
import '../components/Card.css';

function DiscoverGroupCard({ group, isAuthenticated, pending, onJoin, t }) {
  const bannerUrl = group.coverImage?.url
    ? `${API_URL}${group.coverImage.url}`
    : group.profilePicture?.url
      ? `${API_URL}${group.profilePicture.url}`
      : null;
  return (
    <div className="card">
      <Link to={`/groups/${group.documentId}`} className="card__link">
        {bannerUrl ? (
          <img className="card__poster" src={bannerUrl} alt="" />
        ) : (
          <div className="card__poster card__poster--placeholder" />
        )}
        <div className="card__title">{group.name}</div>
        <div className="card__meta caption">
          {group.category}
          {group.members ? t.card.member(group.members.length) : ''}
        </div>
        <div className="card__description">{group.description}</div>
      </Link>
      {isAuthenticated && (
        <div className="card__footer">
          <Button disabled={pending} onClick={() => onJoin(group)}>
            {t.discover.join}
          </Button>
        </div>
      )}
    </div>
  );
}

function DiscoverSection({ title, blurb, groups, isAuthenticated, pendingId, onJoin, t }) {
  if (groups.length === 0) return null;
  return (
    <section style={{ marginTop: '2.5rem' }}>
      <h2 className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ash-fg)', letterSpacing: '0.06em' }}>
        {title}
      </h2>
      {blurb && (
        <p className="caption" style={{ marginTop: '0.35rem' }}>
          {blurb}
        </p>
      )}
      <div className="card-grid">
        {groups.map((group) => (
          <DiscoverGroupCard
            key={group.documentId}
            group={group}
            isAuthenticated={isAuthenticated}
            pending={pendingId === group.documentId}
            onJoin={onJoin}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}

export function Discover() {
  const { isAuthenticated, student, refreshStudent } = useAuth();
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    listGroups()
      .then(setGroups)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(group) {
    setPendingId(group.documentId);
    try {
      await joinGroup(group.documentId);
      await refreshStudent();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  const myGroups = student?.groups || [];
  const myGroupIds = new Set(myGroups.map((g) => g.documentId));
  const myCategories = new Set(myGroups.map((g) => g.category).filter(Boolean));

  // Each section pulls from what's left after earlier sections claim their groups,
  // so nothing already joined — or already recommended above — shows up twice.
  const shown = new Set(myGroupIds);

  const recommended =
    isAuthenticated && myCategories.size > 0
      ? groups.filter((g) => !shown.has(g.documentId) && myCategories.has(g.category))
      : [];
  recommended.forEach((g) => shown.add(g.documentId));

  const popular = [...groups]
    .filter((g) => !shown.has(g.documentId))
    .sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0))
    .slice(0, 4);
  popular.forEach((g) => shown.add(g.documentId));

  const newest = [...groups]
    .filter((g) => !shown.has(g.documentId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);
  newest.forEach((g) => shown.add(g.documentId));

  const nothingToDiscover = !loading && !error && groups.length > 0 && shown.size === groups.length && recommended.length === 0 && popular.length === 0 && newest.length === 0;

  return (
    <div>
      <h1>{t.discover.title}</h1>
      <p className="caption" style={{ marginTop: '0.5rem' }}>
        {isAuthenticated ? t.discover.subtitleAuth : t.discover.subtitleGuest}
      </p>

      {loading && <p className="caption">{t.discover.loadingGroups}</p>}
      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {nothingToDiscover && (
        <p className="caption" style={{ marginTop: '1.5rem' }}>
          {t.discover.allJoined}
        </p>
      )}

      <DiscoverSection
        title={t.discover.recommendedTitle}
        blurb={t.discover.recommendedBlurb}
        groups={recommended}
        isAuthenticated={isAuthenticated}
        pendingId={pendingId}
        onJoin={handleJoin}
        t={t}
      />
      <DiscoverSection
        title={t.discover.popularTitle}
        blurb={t.discover.popularBlurb}
        groups={popular}
        isAuthenticated={isAuthenticated}
        pendingId={pendingId}
        onJoin={handleJoin}
        t={t}
      />
      <DiscoverSection
        title={t.discover.newTitle}
        blurb={t.discover.newBlurb}
        groups={newest}
        isAuthenticated={isAuthenticated}
        pendingId={pendingId}
        onJoin={handleJoin}
        t={t}
      />
    </div>
  );
}
