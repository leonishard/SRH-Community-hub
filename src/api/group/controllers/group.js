'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getAuthenticatedStudent, isCoordinator } = require('../../../utils/students');

module.exports = createCoreController('api::group.group', ({ strapi }) => ({
  /**
   * Group details editing is gated by the `is-own-group-manager` policy
   * (config'd on the route). Here we additionally strip `manager`/`members`
   * for non-Coordinators — reassigning the manager or membership is handled
   * by dedicated flows (join/leave, and manager changes stay Coordinator-only).
   */
  async update(ctx) {
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    if (!isCoordinator(ctx.state.user)) {
      delete data.manager;
      delete data.members;
    }

    ctx.request.body = { ...body, data };
    return super.update(ctx);
  },

  /** Lets the authenticated student subscribe to (join) a group. Publicly visible membership. */
  async join(ctx) {
    const student = await getAuthenticatedStudent(strapi, ctx.state.user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const { id: documentId } = ctx.params;
    const group = await strapi.documents('api::group.group').findOne({ documentId });
    if (!group) {
      return ctx.notFound('Group not found.');
    }

    const updated = await strapi.documents('api::group.group').update({
      documentId,
      data: { members: { connect: [{ documentId: student.documentId }] } },
      populate: ['members', 'manager'],
    });

    ctx.body = { data: await this.sanitizeOutput(updated, ctx) };
  },

  /** Lets the authenticated student unsubscribe from (leave) a group. */
  async leave(ctx) {
    const student = await getAuthenticatedStudent(strapi, ctx.state.user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const { id: documentId } = ctx.params;
    const group = await strapi.documents('api::group.group').findOne({ documentId });
    if (!group) {
      return ctx.notFound('Group not found.');
    }

    const updated = await strapi.documents('api::group.group').update({
      documentId,
      data: { members: { disconnect: [{ documentId: student.documentId }] } },
      populate: ['members', 'manager'],
    });

    ctx.body = { data: await this.sanitizeOutput(updated, ctx) };
  },
}));
