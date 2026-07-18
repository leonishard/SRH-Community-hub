'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getAuthenticatedStudent, isCoordinator } = require('../../../utils/students');

module.exports = createCoreController('api::group-proposal.group-proposal', ({ strapi }) => ({
  async find(ctx) {
    if (!isCoordinator(ctx.state.user)) {
      const student = await getAuthenticatedStudent(strapi, ctx.state.user);
      if (!student) {
        return ctx.forbidden('No student profile is linked to this account.');
      }
      ctx.query = {
        ...ctx.query,
        filters: { $and: [ctx.query.filters || {}, { submittedBy: { id: student.id } }] },
      };
    }
    return super.find(ctx);
  },

  async findOne(ctx) {
    const { id: documentId } = ctx.params;
    const entity = await strapi.documents('api::group-proposal.group-proposal').findOne({
      documentId,
      populate: ['submittedBy'],
    });
    if (!entity) {
      return ctx.notFound();
    }

    if (!isCoordinator(ctx.state.user)) {
      const student = await getAuthenticatedStudent(strapi, ctx.state.user);
      if (!student || entity.submittedBy?.documentId !== student.documentId) {
        return ctx.notFound();
      }
    }
    return super.findOne(ctx);
  },

  async create(ctx) {
    const student = await getAuthenticatedStudent(strapi, ctx.state.user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };
    data.submittedBy = student.documentId;
    data.status = 'pending';
    delete data.approvedBy;

    ctx.request.body = { ...body, data };
    return super.create(ctx);
  },

  async update(ctx) {
    const { user } = ctx.state;
    if (!isCoordinator(user)) {
      return ctx.forbidden('Only a Coordinator can review Group Proposals.');
    }

    const { id: documentId } = ctx.params;
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    const existing = await strapi.documents('api::group-proposal.group-proposal').findOne({
      documentId,
      populate: ['submittedBy', 'coverImage', 'profilePicture'],
    });
    if (!existing) {
      return ctx.notFound();
    }

    if (data.status && ['approved', 'rejected'].includes(data.status) && !data.approvedBy) {
      const coordinatorStudent = await getAuthenticatedStudent(strapi, user);
      if (coordinatorStudent) {
        data.approvedBy = coordinatorStudent.documentId;
      }
    }

    ctx.request.body = { ...body, data };
    const result = await super.update(ctx);

    // Approving a proposal spins up the real Group, managed by whoever submitted it.
    if (data.status === 'approved' && existing.status !== 'approved' && existing.submittedBy) {
      await strapi.documents('api::group.group').create({
        data: {
          name: existing.name,
          description: existing.description,
          category: existing.category,
          coverImage: existing.coverImage?.id,
          profilePicture: existing.profilePicture?.id,
          manager: existing.submittedBy.documentId,
        },
      });
    }

    return result;
  },
}));
