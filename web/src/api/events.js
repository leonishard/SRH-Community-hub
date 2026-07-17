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

export async function reviewEvent(documentId, status) {
  return api.put(`/events/${documentId}`, { status });
}

export async function submitEvent({ title, description, date, location, group }) {
  return api.post('/events', { title, description, date, location, group });
}
