import { useState } from 'react';
import { sendFriendRequest } from '../api/friendships';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './Button';
import './FriendActionButton.css';

/** Three-state widget: Add (action) / Requested (muted) / Friends (mono checkmark). */
export function FriendActionButton({ targetDocumentId, status, onChange, onError }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);

  if (status === 'self') {
    return null;
  }

  if (status === 'friends') {
    return <span className="friend-action friend-action--friends mono">{t.friendAction.friends}</span>;
  }

  if (status === 'requested') {
    return <span className="friend-action friend-action--requested mono">{t.friendAction.requested}</span>;
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
      {pending ? t.friendAction.sending : t.friendAction.add}
    </Button>
  );
}
