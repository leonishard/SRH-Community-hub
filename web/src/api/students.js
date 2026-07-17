import { api } from './client';

export async function listStudents(params = {}) {
  const res = await api.get('/students', { 'pagination[pageSize]': 100, ...params });
  return res.data;
}
