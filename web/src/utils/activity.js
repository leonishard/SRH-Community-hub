/**
 * Turns raw Event/Post/Friendship records into Activity Ledger entries.
 * Only synthesizes entries from data the backend already returned for this
 * user (role-scoped visibility is enforced server-side, not here).
 */
export function buildLedgerEntries({ student, myGroupIds, events, posts, friendships, t }) {
  const entries = [];

  for (const post of posts) {
    if (!myGroupIds.has(post.group?.documentId)) continue;
    entries.push({
      id: `post-${post.documentId}`,
      timestamp: post.createdAt,
      accent: '--signal',
      text: t.activity.postedIn(post.author?.name || t.activity.someone, post.group?.name || t.activity.aGroup),
    });
  }

  for (const event of events) {
    if (!myGroupIds.has(event.group?.documentId)) continue;

    if (event.status === 'approved' || event.status === 'rejected') {
      entries.push({
        id: `event-decision-${event.documentId}`,
        timestamp: event.updatedAt,
        accent: event.status === 'approved' ? '--status-approved' : '--status-rejected',
        text: t.activity.eventStatus(event.status, event.title),
      });
    } else if (event.status === 'pending') {
      entries.push({
        id: `event-submitted-${event.documentId}`,
        timestamp: event.createdAt,
        accent: '--status-pending',
        text: t.activity.newEventSubmitted(event.title),
      });
    }
  }

  for (const friendship of friendships) {
    const isRequester = friendship.requester?.documentId === student.documentId;
    const other = isRequester ? friendship.addressee : friendship.requester;
    if (!other) continue;

    if (friendship.status === 'accepted') {
      entries.push({
        id: `friendship-accepted-${friendship.documentId}`,
        timestamp: friendship.updatedAt,
        accent: '--signal',
        text: t.activity.nowFriends(other.name),
      });
    } else if (friendship.status === 'pending') {
      entries.push({
        id: `friendship-pending-${friendship.documentId}`,
        timestamp: friendship.createdAt,
        accent: '--ash',
        text: isRequester ? t.activity.sentRequest(other.name) : t.activity.receivedRequest(other.name),
      });
    }
  }

  return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
