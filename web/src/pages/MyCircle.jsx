import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listEvents } from '../api/events';
import { listPosts } from '../api/posts';
import { listFriendships } from '../api/friendships';
import { buildLedgerEntries } from '../utils/activity';
import { LedgerEntry } from '../components/LedgerEntry';
import './MyCircle.css';

export function MyCircle() {
  const { student } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!student) return;

    const myGroupIds = new Set((student.groups || []).map((g) => g.documentId));

    setLoading(true);
    Promise.all([listEvents(), listPosts(), listFriendships()])
      .then(([events, posts, friendships]) => {
        setEntries(buildLedgerEntries({ student, myGroupIds, events, posts, friendships }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [student]);

  const myGroups = student?.groups || [];

  return (
    <div className="my-circle">
      <header className="my-circle__header">
        <h1>My Circle</h1>
        <p className="caption">
          {myGroups.length > 0
            ? `Member of ${myGroups.map((g) => g.name).join(', ')}`
            : 'Not a member of any group yet — visit Discover to join one.'}
        </p>
      </header>

      <section className="my-circle__activity">
        <h2 className="my-circle__section-title mono">ACTIVITY</h2>

        {loading && <p className="caption">Loading activity…</p>}
        {error && <p className="caption my-circle__error">{error}</p>}

        {!loading && !error && entries.length === 0 && (
          <p className="caption">No activity yet in your groups. Join one from Discover to see it here.</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="my-circle__ledger">
            {entries.map((entry) => (
              <LedgerEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
