import { api, setToken } from './client';

export async function login(identifier, password) {
  const res = await api.postRaw('/auth/local', { identifier, password });
  setToken(res.jwt);
  return res.user;
}

export function logout() {
  setToken(null);
}

export function getMe() {
  // Note: users-permissions' `me` action never exposes `role`, regardless of
  // populate — roleType comes from /students/me instead (see AuthContext).
  return api.get('/users/me');
}

export async function fetchMyStudentProfile() {
  const res = await api.get('/students/me');
  return res.data;
}
