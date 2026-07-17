import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listGroups, joinGroup, leaveGroup } from '../api/groups';
import { Button } from '../components/Button';
import '../components/Card.css';

export function Groups() {
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
    </div>
  );
}
