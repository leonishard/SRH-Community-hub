import { api, uploadFile } from './client';

export async function listGroupProposals(params = {}) {
  const res = await api.get('/group-proposals', {
    'pagination[pageSize]': 100,
    'sort[0]': 'createdAt:desc',
    populate: 'submittedBy,approvedBy',
    ...params,
  });
  return res.data;
}

export async function submitGroupProposal({ name, description, category, coverImage, profilePicture }) {
  return api.post('/group-proposals', { name, description, category, coverImage, profilePicture });
}

export async function uploadGroupProposalImage(file) {
  return uploadFile(file);
}

export async function reviewGroupProposal(documentId, status) {
  return api.put(`/group-proposals/${documentId}`, { status });
}
