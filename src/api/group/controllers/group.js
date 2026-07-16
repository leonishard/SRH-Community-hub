'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getAuthenticatedStudent } = require('../../../utils/students');

module.exports = createCoreController('api::group.group', ({ strapi }) => ({
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
