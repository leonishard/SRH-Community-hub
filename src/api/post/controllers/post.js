'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const {
  getAuthenticatedStudent,
  isCoordinator,
  isManagerOfGroup,
} = require('../../../utils/students');
const { extractRelationDocumentId } = require('../../../utils/relations');

module.exports = createCoreController('api::post.post', ({ strapi }) => ({
  async create(ctx) {
    const { user } = ctx.state;
    const student = await getAuthenticatedStudent(strapi, user);
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    if (isCoordinator(user)) {
      if (!data.author && student) {
        data.author = student.documentId;
      }
      ctx.request.body = { ...body, data };
      return super.create(ctx);
    }

    // Only Group Managers and Coordinators have create permission on Post.
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const groupDocumentId = extractRelationDocumentId(data.group);
    const managesGroup = await isManagerOfGroup(strapi, student, groupDocumentId);
    if (!managesGroup) {
      return ctx.forbidden('You can only post to groups you manage.');
    }

    data.author = student.documentId;

    ctx.request.body = { ...body, data };
    return super.create(ctx);
  },

  async update(ctx) {
    const { user } = ctx.state;
    const { id: documentId } = ctx.params;
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    if (isCoordinator(user)) {
      return super.update(ctx);
    }

    const existing = await strapi.documents('api::post.post').findOne({
      documentId,
      populate: ['group'],
    });
    if (!existing) {
      return ctx.notFound();
    }

    const student = await getAuthenticatedStudent(strapi, user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const managesCurrentGroup = await isManagerOfGroup(strapi, student, existing.group?.documentId);
    if (!managesCurrentGroup) {
      return ctx.forbidden('You can only manage posts for groups you manage.');
    }

    if (data.group) {
      const targetGroupId = extractRelationDocumentId(data.group);
      const managesTargetGroup = await isManagerOfGroup(strapi, student, targetGroupId);
      if (!managesTargetGroup) {
        return ctx.forbidden('You cannot move this post to a group you do not manage.');
      }
    }

    ctx.request.body = { ...body, data };
    return super.update(ctx);
  },
}));
