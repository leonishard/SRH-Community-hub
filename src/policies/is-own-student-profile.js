'use strict';

const { isCoordinator } = require('../utils/students');

/**
 * Gate for Student.update: allows a Coordinator through unconditionally, and
 * any other Student only when the record being edited (ctx.params.id) is the
 * one linked to their own account.
 */
module.exports = async (ctx, config, { strapi }) => {
  const { user } = ctx.state;

  if (isCoordinator(user)) {
    return true;
  }

  if (!user) {
    return false;
  }

  const { id: documentId } = ctx.params;
  const target = await strapi.documents('api::student.student').findOne({
    documentId,
    populate: ['user'],
  });

  return Boolean(target?.user) && target.user.documentId === user.documentId;
};
