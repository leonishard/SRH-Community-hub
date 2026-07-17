'use strict';

const { getAuthenticatedStudent, isCoordinator } = require('../utils/students');

/**
 * Gate for Group.update: allows a Coordinator through unconditionally, and a
 * Group Manager only when they are the `manager` of the specific group being
 * edited (ctx.params.id). This is the row-level scoping the default Strapi
 * Roles & Permissions plugin can't express — it only toggles actions on/off
 * per content type, not "your own records only".
 */
module.exports = async (ctx, config, { strapi }) => {
  const { user } = ctx.state;

  if (isCoordinator(user)) {
    return true;
  }

  const student = await getAuthenticatedStudent(strapi, user);
  if (!student) {
    return false;
  }

  const { id: documentId } = ctx.params;
  const group = await strapi.documents('api::group.group').findOne({
    documentId,
    populate: ['manager'],
  });

  return Boolean(group?.manager) && group.manager.documentId === student.documentId;
};
