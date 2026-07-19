import { api, uploadFile } from './client';

export async function listGroups(params = {}) {
  const res = await api.get('/groups', {
    'pagination[pageSize]': 100,
    populate: 'manager,members,profilePicture',
    ...params,
  });
  return res.data;
}

export async function getGroup(documentId) {
  const res = await api.get(`/groups/${documentId}`, { populate: 'manager,members,coverImage,profilePicture' });
  return res.data;
}

/** Requires the `is-own-group-manager` policy server-side: this group's manager, or a Coordinator. */
export async function updateGroup(documentId, data) {
  return api.put(`/groups/${documentId}`, data);
}

/** Coordinator-only server-side (the group_manager role has no `delete` action enabled). */
export async function deleteGroup(documentId) {
  return api.del(`/groups/${documentId}`);
}

export async function uploadGroupCoverImage(file) {
  return uploadFile(file);
}

export async function uploadGroupProfilePicture(file) {
  return uploadFile(file);
}

export async function joinGroup(documentId) {
  return api.post(`/groups/${documentId}/join`);
}

export async function leaveGroup(documentId) {
  return api.post(`/groups/${documentId}/leave`);
}
