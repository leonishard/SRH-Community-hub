import { api, uploadFile } from './client';

export async function listEvents(params = {}) {
  const res = await api.get('/events', {
    'pagination[pageSize]': 50,
    'sort[0]': 'createdAt:desc',
    populate: 'group,submittedBy,approvedBy,poster,attendees',
    ...params,
  });
  return res.data;
}

export async function getEvent(documentId) {
  const res = await api.get(`/events/${documentId}`, {
    populate: 'group,submittedBy,approvedBy,poster,attendees',
  });
  return res.data;
}

export async function reviewEvent(documentId, status) {
  return api.put(`/events/${documentId}`, { status });
}

export async function submitEvent({ title, description, date, location, group, poster }) {
  return api.post('/events', { title, description, date, location, group, poster });
}

export async function uploadEventPoster(file) {
  return uploadFile(file);
}

export async function attendEvent(documentId) {
  return api.post(`/events/${documentId}/attend`);
}

export async function unattendEvent(documentId) {
  return api.post(`/events/${documentId}/unattend`);
}
