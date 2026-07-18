import { api, uploadFile as uploadFileRequest } from './client';

export async function listStudents(params = {}) {
  const res = await api.get('/students', { 'pagination[pageSize]': 100, ...params });
  return res.data;
}

/** Returns the privacy-gated profile shape (see backend api::student.student findOne). */
export async function getStudentProfile(documentId) {
  const res = await api.get(`/students/${documentId}`);
  return res.data;
}

export async function updateStudentProfile(documentId, data) {
  return api.put(`/students/${documentId}`, data);
}

export async function uploadProfilePicture(file) {
  return uploadFileRequest(file);
}
