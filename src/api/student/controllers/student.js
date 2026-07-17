'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getAuthenticatedStudent, isCoordinator } = require('../../../utils/students');

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

  /**
   * Editing is gated by the `is-own-student-profile` policy (config'd on the
   * route) so a Student can only ever hit their own record here. On top of
   * that, non-Coordinators can't repoint the `user` relation — that would let
   * someone hijack another account's profile.
   */
  async update(ctx) {
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    if (!isCoordinator(ctx.state.user)) {
      delete data.user;
    }

    ctx.request.body = { ...body, data };
    return super.update(ctx);
  },
}));
