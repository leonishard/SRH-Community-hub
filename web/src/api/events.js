import { api } from './client';

export async function listEvents(params = {}) {
  const res = await api.get('/events', {
    'pagination[pageSize]': 50,
    'sort[0]': 'createdAt:desc',
    populate: 'group,submittedBy,approvedBy',
    ...params,
  });
  return res.data;
}
