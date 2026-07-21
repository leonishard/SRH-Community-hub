'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const {
  getAuthenticatedStudent,
  isCoordinator,
  promoteToGroupManager,
  demoteIfNoOtherGroups,
} = require('../../../utils/students');
const { extractRelationDocumentId } = require('../../../utils/relations');

module.exports = createCoreController('api::group.group', ({ strapi }) => ({
  /**
   * Group details editing is gated by the `is-own-group-manager` policy
   * (config'd on the route). Here we additionally strip `manager`/`members`
   * for non-Coordinators — reassigning the manager or membership is handled
   * by dedicated flows (join/leave, and manager changes stay Coordinator-only).
   * When a Coordinator DOES change `manager`, keep the affected accounts'
   * actual users-permissions roles in sync with the relation (see students.js).
   */
  async update(ctx) {
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    if (!isCoordinator(ctx.state.user)) {
      delete data.manager;
      delete data.members;
      ctx.request.body = { ...body, data };
      return super.update(ctx);
    }

    const { id: documentId } = ctx.params;
    const changingManager = 'manager' in data;
    let previousManagerId;
    if (changingManager) {
      const existing = await strapi.documents('api::group.group').findOne({
        documentId,
        populate: ['manager'],
      });
      previousManagerId = existing?.manager?.documentId;
    }

    ctx.request.body = { ...body, data };
    const result = await super.update(ctx);

    if (changingManager) {
      const newManagerId = extractRelationDocumentId(data.manager);
      if (newManagerId && newManagerId !== previousManagerId) {
        await promoteToGroupManager(strapi, newManagerId);
      }
      if (previousManagerId && previousManagerId !== newManagerId) {
        await demoteIfNoOtherGroups(strapi, previousManagerId);
      }
    }

    return result;
  },

  /**
   * Deleting is gated purely by the role-permission action toggle (only
   * Coordinator has `group.delete` enabled — see src/index.js). If the group
   * had a manager, demote them afterward if this was their only managed group,
   * same as the reassignment path above.
   */
  async delete(ctx) {
    const { id: documentId } = ctx.params;
    const existing = await strapi.documents('api::group.group').findOne({
      documentId,
      populate: ['manager'],
    });

    const result = await super.delete(ctx);

    if (existing?.manager) {
      await demoteIfNoOtherGroups(strapi, existing.manager.documentId);
    }

    return result;
  },

  /** Lets the authenticated student subscribe to (join) a group. Publicly visible membership. */
  async join(ctx) {
    const student = await getAuthenticatedStudent(strapi, ctx.state.user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const { id: documentId } = ctx.params;
    const group = await strapi.documents('api::group.group').findOne({
      documentId,
      populate: ['members'],
    });
    if (!group) {
      return ctx.notFound('Group not found.');
    }

    const alreadyMember = (group.members || []).some((m) => m.documentId === student.documentId);
    if (!alreadyMember && group.memberLimit && (group.members || []).length >= group.memberLimit) {
      return ctx.badRequest('This group has reached its member limit.');
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
