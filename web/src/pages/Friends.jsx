import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listFriendships, sendFriendRequest, acceptFriendRequest, removeFriendship } from '../api/friendships';
import { listStudents } from '../api/students';
import { Button } from '../components/Button';
import './Friends.css';

export function Friends() {
  const { student } = useAuth();
  const [friendships, setFriendships] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [allFriendships, allStudents] = await Promise.all([listFriendships(), listStudents()]);
      setFriendships(allFriendships);
      setStudents(allStudents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!student) {
    return (
      <div>
        <h1>Friends</h1>
        <p className="caption" style={{ marginTop: '0.5rem' }}>
          Sign in to see and manage your friends.
        </p>
      </div>
    );
  }

  const mine = friendships.filter(
    (f) =>
      f.requester &&
      f.addressee &&
      (f.requester.documentId === student.documentId || f.addressee.documentId === student.documentId)
  );
  const accepted = mine.filter((f) => f.status === 'accepted');
  const incoming = mine.filter((f) => f.status === 'pending' && f.addressee?.documentId === student.documentId);
  const outgoing = mine.filter((f) => f.status === 'pending' && f.requester?.documentId === student.documentId);

  const connectedIds = new Set(
    mine.map((f) => (f.requester?.documentId === student.documentId ? f.addressee?.documentId : f.requester?.documentId))
  );
  const addable = students.filter((s) => s.documentId !== student.documentId && !connectedIds.has(s.documentId));

  async function runAction(documentId, action) {
    setPendingId(documentId);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  async function handleSendRequest() {
    if (!selectedStudentId) return;
    setPendingId('new-request');
    try {
      await sendFriendRequest(selectedStudentId);
      setSelectedStudentId('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  function otherStudent(friendship) {
    return friendship.requester?.documentId === student.documentId ? friendship.addressee : friendship.requester;
  }

  return (
    <div>
      <h1>Friends</h1>
      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}
      {loading && <p className="caption">Loading…</p>}

      {!loading && (
        <>
          <section className="friends-section">
            <h2 className="friends-section__title mono">ADD A FRIEND</h2>
            <div className="friends-add">
              <select
                className="friends-add__select"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">Select a student…</option>
                {addable.map((s) => (
                  <option key={s.documentId} value={s.documentId}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button disabled={!selectedStudentId || pendingId === 'new-request'} onClick={handleSendRequest}>
                SEND REQUEST
              </Button>
            </div>
          </section>

          {incoming.length > 0 && (
            <section className="friends-section">
              <h2 className="friends-section__title mono">REQUESTS</h2>
              {incoming.map((f) => (
                <div className="friends-row" key={f.documentId}>
                  <span>{otherStudent(f)?.name}</span>
                  <div className="friends-row__actions">
                    <Button
                      disabled={pendingId === f.documentId}
                      onClick={() => runAction(f.documentId, () => acceptFriendRequest(f.documentId))}
                    >
                      ACCEPT
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pendingId === f.documentId}
                      onClick={() => runAction(f.documentId, () => removeFriendship(f.documentId))}
                    >
                      DECLINE
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {outgoing.length > 0 && (
            <section className="friends-section">
              <h2 className="friends-section__title mono">SENT</h2>
              {outgoing.map((f) => (
                <div className="friends-row" key={f.documentId}>
                  <span>{otherStudent(f)?.name}</span>
                  <div className="friends-row__actions">
                    <span className="caption">PENDING</span>
                    <Button
                      variant="outline"
                      disabled={pendingId === f.documentId}
                      onClick={() => runAction(f.documentId, () => removeFriendship(f.documentId))}
                    >
                      CANCEL
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="friends-section">
            <h2 className="friends-section__title mono">YOUR FRIENDS</h2>
            {accepted.length === 0 && <p className="caption">No friends yet — send a request above.</p>}
            {accepted.map((f) => (
              <div className="friends-row" key={f.documentId}>
                <span>{otherStudent(f)?.name}</span>
                <div className="friends-row__actions">
                  <Button
                    variant="outline"
                    disabled={pendingId === f.documentId}
                    onClick={() => runAction(f.documentId, () => removeFriendship(f.documentId))}
                  >
                    REMOVE
                  </Button>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
