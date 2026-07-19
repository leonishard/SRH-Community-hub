import { api } from './client';

export async function listPosts(params = {}) {
  const res = await api.get('/posts', {
    'pagination[pageSize]': 50,
    'sort[0]': 'createdAt:desc',
    populate: 'group,author',
    ...params,
  });
  return res.data;
}

/** Requires this group's manager or a Coordinator — enforced server-side. */
export async function createPost(groupDocumentId, content) {
  return api.post('/posts', { content, group: groupDocumentId });
}
