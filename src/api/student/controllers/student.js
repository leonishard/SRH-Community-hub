'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getAuthenticatedStudent } = require('../../../utils/students');

module.exports = createCoreController('api::student.student', ({ strapi }) => ({
  /** Resolves the Student profile linked to the calling account, without exposing the `user` relation to clients. */
  async me(ctx) {
    const student = await getAuthenticatedStudent(strapi, ctx.state.user);
    if (!student) {
      return ctx.notFound('No student profile is linked to this account.');
    }

    const populated = await strapi.documents('api::student.student').findOne({
      documentId: student.documentId,
      populate: ['groups', 'managedGroups', 'profilePicture'],
    });

    const sanitized = await this.sanitizeOutput(populated, ctx);
    // users-permissions.user.me never exposes the caller's role, so surface
    // it here for clients that need to branch on it (e.g. the frontend UI).
    ctx.body = { data: { ...sanitized, roleType: ctx.state.user.role?.type ?? null } };
  },
}));
