import { api } from './client';

export async function listGroups(params = {}) {
  const res = await api.get('/groups', {
    'pagination[pageSize]': 100,
    populate: 'manager,members',
    ...params,
  });
  return res.data;
}

export async function joinGroup(documentId) {
  return api.post(`/groups/${documentId}/join`);
}

export async function leaveGroup(documentId) {
  return api.post(`/groups/${documentId}/leave`);
}
