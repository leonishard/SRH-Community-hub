'use strict';

/** Resolves the Student profile linked to the currently authenticated users-permissions user. */
async function getAuthenticatedStudent(strapi, user) {
  if (!user) {
    return null;
  }

  const students = await strapi.documents('api::student.student').findMany({
    filters: { user: { id: user.id } },
    limit: 1,
  });

  return students[0] || null;
}

function isCoordinator(user) {
  return user?.role?.type === 'coordinator';
}

function isGroupManager(user) {
  return user?.role?.type === 'group_manager';
}

/** Whether `student` is the manager of the group identified by `groupDocumentId`. */
async function isManagerOfGroup(strapi, student, groupDocumentId) {
  if (!student || !groupDocumentId) {
    return false;
  }

  const group = await strapi.documents('api::group.group').findOne({
    documentId: groupDocumentId,
    populate: ['manager'],
  });

  return Boolean(group?.manager) && group.manager.documentId === student.documentId;
}

/** 'none' | 'requested' (pending either direction) | 'friends' (accepted) between two students. */
async function getFriendshipStatus(strapi, viewerStudent, targetStudent) {
  if (!viewerStudent || !targetStudent || viewerStudent.documentId === targetStudent.documentId) {
    return 'none';
  }

  const friendships = await strapi.documents('api::friendship.friendship').findMany({
    filters: {
      $or: [
        { requester: { id: viewerStudent.id }, addressee: { id: targetStudent.id } },
        { requester: { id: targetStudent.id }, addressee: { id: viewerStudent.id } },
      ],
    },
    limit: 1,
  });

  if (friendships.length === 0) {
    return 'none';
  }
  return friendships[0].status === 'accepted' ? 'friends' : 'requested';
}

/** Public-safe summaries of everyone `student` has an accepted friendship with. */
async function getAcceptedFriends(strapi, student) {
  const friendships = await strapi.documents('api::friendship.friendship').findMany({
    filters: {
      status: 'accepted',
      $or: [{ requester: { id: student.id } }, { addressee: { id: student.id } }],
    },
    populate: ['requester', 'addressee'],
  });

  return friendships
    .map((f) => (f.requester?.id === student.id ? f.addressee : f.requester))
    .filter(Boolean)
    .map((s) => ({ documentId: s.documentId, name: s.name, profilePicture: s.profilePicture }));
}

module.exports = {
  getAuthenticatedStudent,
  isCoordinator,
  isGroupManager,
  isManagerOfGroup,
  getFriendshipStatus,
  getAcceptedFriends,
};
