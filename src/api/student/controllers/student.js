'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const {
  getAuthenticatedStudent,
  isCoordinator,
  getFriendshipStatus,
  getAcceptedFriends,
} = require('../../../utils/students');

function buildContributions(student) {
  return {
    posts: student.posts?.length || 0,
    comments: student.comments?.length || 0,
    eventsHosted: student.submittedEvents?.length || 0,
  };
}

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
   * Profile view. name/profilePicture/bio/program are always visible; the
   * Groups (membership + managed), Friends, and Contributions sections are
   * each gated on TWO independent conditions: the viewer must be the owner
   * or an accepted friend, AND the owner's corresponding toggle must be on.
   * Coordinators don't get a bypass here — this is a privacy setting, not an
   * access control the admin role overrides. Sections the viewer can't see
   * are omitted entirely rather than shown as a locked placeholder.
   */
  async findOne(ctx) {
    const { id: documentId } = ctx.params;
    const target = await strapi.documents('api::student.student').findOne({
      documentId,
      populate: ['profilePicture', 'groups', 'managedGroups', 'posts', 'comments', 'submittedEvents'],
    });
    if (!target) {
      return ctx.notFound();
    }

    const viewerStudent = await getAuthenticatedStudent(strapi, ctx.state.user);
    const isOwner = Boolean(viewerStudent) && viewerStudent.documentId === target.documentId;
    const friendStatus = isOwner ? 'self' : await getFriendshipStatus(strapi, viewerStudent, target);

    const payload = {
      documentId: target.documentId,
      name: target.name,
      bio: target.bio,
      program: target.program,
      profilePicture: target.profilePicture,
      isOwner,
      friendStatus,
    };

    const canSeeGated = isOwner || friendStatus === 'friends';
    // Rows created before these columns existed have `null`, not `true` — schema
    // defaults only apply to new rows. Treat anything but an explicit `false` as on.
    const showGroups = target.showGroupsOnProfile !== false;
    const showFriends = target.showFriendsOnProfile !== false;
    const showContributions = target.showContributionsOnProfile !== false;

    if (isOwner) {
      payload.showGroupsOnProfile = showGroups;
      payload.showFriendsOnProfile = showFriends;
      payload.showContributionsOnProfile = showContributions;
      payload.groups = target.groups;
      payload.managedGroups = target.managedGroups;
      payload.friends = await getAcceptedFriends(strapi, target);
      payload.contributions = buildContributions(target);
    } else {
      if (canSeeGated && showGroups) {
        payload.groups = target.groups;
        payload.managedGroups = target.managedGroups;
      }
      if (canSeeGated && showFriends) {
        payload.friends = await getAcceptedFriends(strapi, target);
      }
      if (canSeeGated && showContributions) {
        payload.contributions = buildContributions(target);
      }
    }

    ctx.body = { data: payload };
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
