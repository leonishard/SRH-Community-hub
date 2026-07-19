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

/** Looks up a users-permissions role's numeric id by its `type` slug (e.g. 'group_manager'). */
async function findRoleIdByType(strapi, roleType) {
  const roleService = strapi.plugin('users-permissions').service('role');
  const roles = await roleService.find();
  return roles.find((r) => r.type === roleType)?.id;
}

/**
 * Promotes the account linked to `studentDocumentId` to the Group Manager role,
 * unless it's already a Coordinator (never downgrade) or already Group Manager.
 * Being the relational `manager` of a Group means nothing permission-wise unless
 * the account's actual users-permissions role also has the group_manager actions
 * enabled — this keeps the two in sync whenever someone becomes a manager.
 */
async function promoteToGroupManager(strapi, studentDocumentId) {
  const student = await strapi.documents('api::student.student').findOne({
    documentId: studentDocumentId,
    populate: ['user'],
  });
  if (!student?.user) {
    return;
  }

  const userRecord = await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: student.user.documentId,
    populate: ['role'],
  });
  if (!userRecord || ['coordinator', 'group_manager'].includes(userRecord.role?.type)) {
    return;
  }

  const groupManagerRoleId = await findRoleIdByType(strapi, 'group_manager');
  if (!groupManagerRoleId) {
    return;
  }

  await strapi.documents('plugin::users-permissions.user').update({
    documentId: student.user.documentId,
    data: { role: groupManagerRoleId },
  });
}

/**
 * Demotes the account linked to `studentDocumentId` back to Authenticated, but only
 * if they no longer manage any group (call this AFTER the reassignment/removal that
 * took the group away from them) and only if they're currently Group Manager —
 * Coordinators are never touched.
 */
async function demoteIfNoOtherGroups(strapi, studentDocumentId) {
  const student = await strapi.documents('api::student.student').findOne({
    documentId: studentDocumentId,
    populate: ['user', 'managedGroups'],
  });
  if (!student?.user || (student.managedGroups || []).length > 0) {
    return;
  }

  const userRecord = await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: student.user.documentId,
    populate: ['role'],
  });
  if (userRecord?.role?.type !== 'group_manager') {
    return;
  }

  const authenticatedRoleId = await findRoleIdByType(strapi, 'authenticated');
  if (!authenticatedRoleId) {
    return;
  }

  await strapi.documents('plugin::users-permissions.user').update({
    documentId: student.user.documentId,
    data: { role: authenticatedRoleId },
  });
}

module.exports = {
  getAuthenticatedStudent,
  isCoordinator,
  isGroupManager,
  isManagerOfGroup,
  getFriendshipStatus,
  getAcceptedFriends,
  promoteToGroupManager,
  demoteIfNoOtherGroups,
};
