import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listGroups, joinGroup } from '../api/groups';
import { Button } from '../components/Button';
import '../components/Card.css';

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

  const myGroupIds = new Set((student?.groups || []).map((g) => g.documentId));
  const discoverable = isAuthenticated ? groups.filter((g) => !myGroupIds.has(g.documentId)) : groups;

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

  return (
    <div>
      <h1>Discover</h1>
      <p className="caption" style={{ marginTop: '0.5rem' }}>
        {isAuthenticated ? "Groups you haven't joined yet." : 'Sign in to join a group.'}
      </p>

      {loading && <p className="caption">Loading groups…</p>}
      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {!loading && !error && discoverable.length === 0 && (
        <p className="caption">You're already a member of every group — check Groups for the full list.</p>
      )}

      {!loading && !error && discoverable.length > 0 && (
        <div className="card-grid">
          {discoverable.map((group) => (
            <div className="card" key={group.documentId}>
              <div className="card__title">{group.name}</div>
              <div className="card__meta caption">
                {group.category}
                {group.members ? ` · ${group.members.length} member${group.members.length === 1 ? '' : 's'}` : ''}
              </div>
              <div className="card__description">{group.description}</div>
              {isAuthenticated && (
                <div className="card__footer">
                  <Button disabled={pendingId === group.documentId} onClick={() => handleJoin(group)}>
                    JOIN
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
