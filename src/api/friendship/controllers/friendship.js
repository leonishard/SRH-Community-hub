'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getAuthenticatedStudent, isCoordinator } = require('../../../utils/students');
const { extractRelationDocumentId } = require('../../../utils/relations');

module.exports = createCoreController('api::friendship.friendship', ({ strapi }) => ({
  async find(ctx) {
    if (!isCoordinator(ctx.state.user)) {
      const student = await getAuthenticatedStudent(strapi, ctx.state.user);
      if (!student) {
        return ctx.forbidden('No student profile is linked to this account.');
      }

      ctx.query = {
        ...ctx.query,
        filters: {
          $and: [
            ctx.query.filters || {},
            { $or: [{ requester: { id: student.id } }, { addressee: { id: student.id } }] },
          ],
        },
      };
    }

    return super.find(ctx);
  },

  async findOne(ctx) {
    const { id: documentId } = ctx.params;
    const entity = await strapi.documents('api::friendship.friendship').findOne({
      documentId,
      populate: ['requester', 'addressee'],
    });

    if (!entity) {
      return ctx.notFound();
    }

    if (!isCoordinator(ctx.state.user)) {
      const student = await getAuthenticatedStudent(strapi, ctx.state.user);
      const isParty =
        student &&
        (entity.requester?.documentId === student.documentId ||
          entity.addressee?.documentId === student.documentId);
      if (!isParty) {
        return ctx.notFound();
      }
    }

    return super.findOne(ctx);
  },

  async create(ctx) {
    const { user } = ctx.state;
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    if (isCoordinator(user)) {
      ctx.request.body = { ...body, data };
      return super.create(ctx);
    }

    const student = await getAuthenticatedStudent(strapi, user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const addresseeDocumentId = extractRelationDocumentId(data.addressee);
    if (!addresseeDocumentId) {
      return ctx.badRequest('An "addressee" is required to send a friend request.');
    }
    if (addresseeDocumentId === student.documentId) {
      return ctx.badRequest('You cannot send a friend request to yourself.');
    }

    const existing = await strapi.documents('api::friendship.friendship').findMany({
      filters: {
        $or: [
          { requester: { id: student.id }, addressee: { documentId: addresseeDocumentId } },
          { requester: { documentId: addresseeDocumentId }, addressee: { id: student.id } },
        ],
      },
      limit: 1,
    });
    if (existing.length > 0) {
      return ctx.badRequest('A friendship request already exists between these students.');
    }

    data.requester = student.documentId;
    data.addressee = addresseeDocumentId;
    data.status = 'pending';

    ctx.request.body = { ...body, data };
    return super.create(ctx);
  },

  async update(ctx) {
    const { user } = ctx.state;
    const { id: documentId } = ctx.params;
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    if (isCoordinator(user)) {
      ctx.request.body = { ...body, data };
      return super.update(ctx);
    }

    const student = await getAuthenticatedStudent(strapi, user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const existing = await strapi.documents('api::friendship.friendship').findOne({
      documentId,
      populate: ['requester', 'addressee'],
    });
    if (!existing) {
      return ctx.notFound();
    }

    // Only the addressee can accept a pending request; requester/addressee reassignment isn't allowed.
    if (existing.addressee?.documentId !== student.documentId) {
      return ctx.forbidden('Only the recipient of a friend request can accept it.');
    }

    ctx.request.body = { ...body, data: { status: 'accepted' } };
    return super.update(ctx);
  },

  async delete(ctx) {
    const { user } = ctx.state;
    const { id: documentId } = ctx.params;

    if (!isCoordinator(user)) {
      const student = await getAuthenticatedStudent(strapi, user);
      if (!student) {
        return ctx.forbidden('No student profile is linked to this account.');
      }

      const existing = await strapi.documents('api::friendship.friendship').findOne({
        documentId,
        populate: ['requester', 'addressee'],
      });
      if (!existing) {
        return ctx.notFound();
      }

      const isParty =
        existing.requester?.documentId === student.documentId ||
        existing.addressee?.documentId === student.documentId;
      if (!isParty) {
        return ctx.forbidden('You can only manage your own friendship requests.');
      }
    }

    return super.delete(ctx);
  },
}));
