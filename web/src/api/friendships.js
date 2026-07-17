import { api } from './client';

export async function listFriendships(params = {}) {
  const res = await api.get('/friendships', {
    'pagination[pageSize]': 100,
    'sort[0]': 'createdAt:desc',
    populate: 'requester,addressee',
    ...params,
  });
  return res.data;
}

export async function sendFriendRequest(addresseeDocumentId) {
  return api.post('/friendships', { addressee: addresseeDocumentId });
}

export async function acceptFriendRequest(documentId) {
  return api.put(`/friendships/${documentId}`, { status: 'accepted' });
}
