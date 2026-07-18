import { useState } from 'react';
import { sendFriendRequest } from '../api/friendships';
import { Button } from './Button';
import './FriendActionButton.css';

/** Three-state widget: Add (action) / Requested (muted) / Friends (mono checkmark). */
export function FriendActionButton({ targetDocumentId, status, onChange, onError }) {
  const [pending, setPending] = useState(false);

  if (status === 'self') {
    return null;
  }

  if (status === 'friends') {
    return <span className="friend-action friend-action--friends mono">✓ FRIENDS</span>;
  }

  if (status === 'requested') {
    return <span className="friend-action friend-action--requested mono">REQUESTED</span>;
  }

  async function handleAdd() {
    setPending(true);
    try {
      await sendFriendRequest(targetDocumentId);
      onChange?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button disabled={pending} onClick={handleAdd}>
      {pending ? 'SENDING…' : 'ADD'}
    </Button>
  );
}
