'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getAuthenticatedStudent, isCoordinator, isManagerOfGroup } = require('../../../utils/students');

/** Author of the comment, the manager of its Post's Group, or a Coordinator. */
async function canModerate(strapi, user, comment) {
  if (isCoordinator(user)) {
    return true;
  }

  const student = await getAuthenticatedStudent(strapi, user);
  if (!student) {
    return false;
  }

  if (comment.author?.documentId === student.documentId) {
    return true;
  }

  return isManagerOfGroup(strapi, student, comment.post?.group?.documentId);
}

async function guardModify(strapi, ctx, next) {
  const { id: documentId } = ctx.params;
  const existing = await strapi.documents('api::comment.comment').findOne({
    documentId,
    populate: ['author', 'post', 'post.group'],
  });
  if (!existing) {
    return ctx.notFound();
  }

  if (!(await canModerate(strapi, ctx.state.user, existing))) {
    return ctx.forbidden('You can only manage your own comments, or moderate comments on groups you manage.');
  }

  return next();
}

/**
 * Comments are meant to be as public as their parent Post, but Student isn't
 * a publicly listable content type (Public/plain roles have no `student.find`
 * action) — the default populate+sanitize pipeline would silently strip
 * `author` for them, and worse, leave the frontend comparing `undefined ===
 * undefined` for "is this my comment". We resolve the author ourselves here
 * and expose only a public-safe summary — same idea as getAcceptedFriends()
 * — rather than opening up the Student directory to everyone.
 */
function toPublicAuthor(student) {
  if (!student) {
    return null;
  }
  return { documentId: student.documentId, name: student.name, profilePicture: student.profilePicture ?? null };
}

module.exports = createCoreController('api::comment.comment', ({ strapi }) => ({
  async find(ctx) {
    const { filters, sort } = ctx.query || {};
    const comments = await strapi.documents('api::comment.comment').findMany({
      filters,
      sort: sort || { createdAt: 'asc' },
      populate: { author: { populate: ['profilePicture'] } },
    });

    ctx.body = {
      data: comments.map((comment) => ({ ...comment, author: toPublicAuthor(comment.author) })),
      meta: {},
    };
  },

  async findOne(ctx) {
    const { id: documentId } = ctx.params;
    const comment = await strapi.documents('api::comment.comment').findOne({
      documentId,
      populate: { author: { populate: ['profilePicture'] } },
    });
    if (!comment) {
      return ctx.notFound();
    }

    ctx.body = { data: { ...comment, author: toPublicAuthor(comment.author) } };
  },

  /**
   * Membership itself is enforced by the `is-group-member-for-post` policy
   * (config'd on this route) — here we just stamp the author, same as
   * Friendship/Post/Event do for their own create actions.
   */
  async create(ctx) {
    const student = await getAuthenticatedStudent(strapi, ctx.state.user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const body = ctx.request.body || {};
    const data = { ...(body.data || {}), author: student.documentId };

    ctx.request.body = { ...body, data };
    return super.create(ctx);
  },

  async update(ctx) {
    return guardModify(strapi, ctx, () => super.update(ctx));
  },

  async delete(ctx) {
    return guardModify(strapi, ctx, () => super.delete(ctx));
  },
}));
