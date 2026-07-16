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

module.exports = {
  getAuthenticatedStudent,
  isCoordinator,
  isGroupManager,
  isManagerOfGroup,
};
