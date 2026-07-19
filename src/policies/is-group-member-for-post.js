'use strict';

const { getAuthenticatedStudent, isCoordinator } = require('../utils/students');
const { extractRelationDocumentId } = require('../utils/relations');

/**
 * Gate for Comment.create: the requester must be an actual member of the
 * Group that the target Post (ctx.request.body.data.post) belongs to. Being
 * logged in alone isn't enough — this is the row-level scoping the default
 * Strapi Roles & Permissions plugin can't express (it only toggles actions
 * on/off per content type, not "member of this specific group").
 */
module.exports = async (ctx, config, { strapi }) => {
  const { user } = ctx.state;

  if (isCoordinator(user)) {
    return true;
  }

  const student = await getAuthenticatedStudent(strapi, user);
  if (!student) {
    return false;
  }

  const body = ctx.request.body || {};
  const postDocumentId = extractRelationDocumentId(body.data?.post);
  if (!postDocumentId) {
    return false;
  }

  const post = await strapi.documents('api::post.post').findOne({
    documentId: postDocumentId,
    populate: ['group', 'group.members'],
  });

  if (!post?.group) {
    return false;
  }

  return (post.group.members || []).some((member) => member.documentId === student.documentId);
};
