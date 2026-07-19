import { api } from './client';

export async function listComments(postDocumentId) {
  const res = await api.get('/comments', {
    'filters[post][documentId][$eq]': postDocumentId,
    'sort[0]': 'createdAt:asc',
    'populate[author][populate]': 'profilePicture',
    'pagination[pageSize]': 100,
  });
  return res.data;
}

/** Requires the `is-group-member-for-post` policy server-side: an actual member of the post's group. */
export async function createComment(postDocumentId, content) {
  return api.post('/comments', { content, post: postDocumentId });
}

/** Author, the post's group manager, or a Coordinator — enforced server-side. */
export async function deleteComment(documentId) {
  return api.del(`/comments/${documentId}`);
}
