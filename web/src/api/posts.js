import { api, uploadFiles } from './client';

export async function listPosts(params = {}) {
  const res = await api.get('/posts', {
    'pagination[pageSize]': 50,
    'sort[0]': 'createdAt:desc',
    populate: 'group,author,media',
    ...params,
  });
  return res.data;
}

/** Requires this group's manager or a Coordinator — enforced server-side. */
export async function createPost(groupDocumentId, content, mediaIds = []) {
  const data = { content, group: groupDocumentId };
  if (mediaIds.length > 0) {
    data.media = mediaIds;
  }
  return api.post('/posts', data);
}

/** Uploads post attachments (images/videos) and returns their file ids. */
export async function uploadPostMedia(files) {
  const uploaded = await uploadFiles(files);
  return uploaded.map((file) => file.id);
}
