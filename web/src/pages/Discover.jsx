import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { listGroups, joinGroup } from '../api/groups';
import { Button } from '../components/Button';
import '../components/Card.css';

function DiscoverGroupCard({ group, isAuthenticated, pending, onJoin }) {
  const thumbUrl = group.profilePicture?.url ? `${API_URL}${group.profilePicture.url}` : null;
  return (
    <div className="card">
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
      {isAuthenticated && (
        <div className="card__footer">
          <Button disabled={pending} onClick={() => onJoin(group)}>
            JOIN
          </Button>
        </div>
      )}
    </div>
  );
}

function DiscoverSection({ title, blurb, groups, isAuthenticated, pendingId, onJoin }) {
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
          />
        ))}
      </div>
    </section>
  );
}

export function Discover() {
  const { isAuthenticated, student, refreshStudent } = useAuth();
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
      <h1>Discover</h1>
      <p className="caption" style={{ marginTop: '0.5rem' }}>
        {isAuthenticated
          ? 'Recommended for you, what people are joining, and what just launched.'
          : 'Sign in to get recommendations based on the groups you follow.'}
      </p>

      {loading && <p className="caption">Loading groups…</p>}
      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {nothingToDiscover && (
        <p className="caption" style={{ marginTop: '1.5rem' }}>
          You're already a member of every group — check Groups for the full list.
        </p>
      )}

      <DiscoverSection
        title="RECOMMENDED FOR YOU"
        blurb="Because you're in a similar group already."
        groups={recommended}
        isAuthenticated={isAuthenticated}
        pendingId={pendingId}
        onJoin={handleJoin}
      />
      <DiscoverSection
        title="POPULAR GROUPS"
        blurb="The most-joined groups on the Hub."
        groups={popular}
        isAuthenticated={isAuthenticated}
        pendingId={pendingId}
        onJoin={handleJoin}
      />
      <DiscoverSection
        title="NEW GROUPS"
        blurb="Recently created — be one of the first to join."
        groups={newest}
        isAuthenticated={isAuthenticated}
        pendingId={pendingId}
        onJoin={handleJoin}
      />
    </div>
  );
}
