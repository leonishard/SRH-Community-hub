'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const {
  getAuthenticatedStudent,
  isCoordinator,
  isManagerOfGroup,
} = require('../../../utils/students');
const { extractRelationDocumentId } = require('../../../utils/relations');

/** Public/plain-student visibility is approved-only; managers/submitters also see their own. */
async function buildEventVisibilityFilter(strapi, user) {
  if (isCoordinator(user)) {
    return null;
  }

  const student = await getAuthenticatedStudent(strapi, user);
  const orConditions = [{ status: 'approved' }];

  if (student) {
    orConditions.push({ submittedBy: { id: student.id } });
    orConditions.push({ group: { manager: { id: student.id } } });
  }

  return { $or: orConditions };
}

async function isEventVisible(strapi, user, entity) {
  if (entity.status === 'approved') {
    return true;
  }
  if (isCoordinator(user)) {
    return true;
  }

  const student = await getAuthenticatedStudent(strapi, user);
  if (!student) {
    return false;
  }

  if (entity.submittedBy?.documentId === student.documentId) {
    return true;
  }
  if (entity.group?.manager?.documentId === student.documentId) {
    return true;
  }
  return false;
}

/**
 * Who's attending is meant to be as public as the event itself, but Student
 * isn't a publicly listable content type — the default populate+sanitize
 * pipeline silently drops `attendees` for roles without `student.find`
 * (Public, in practice). We re-resolve it ourselves and expose only a
 * public-safe summary, same idea as Comment's toPublicAuthor().
 */
function toPublicAttendee(student) {
  if (!student) {
    return null;
  }
  return { documentId: student.documentId, name: student.name };
}

async function attachPublicAttendees(strapi, data) {
  const entities = Array.isArray(data) ? data : [data];
  await Promise.all(
    entities.map(async (entity) => {
      if (!entity?.documentId) return;
      const withAttendees = await strapi.documents('api::event.event').findOne({
        documentId: entity.documentId,
        populate: ['attendees'],
      });
      entity.attendees = (withAttendees?.attendees || []).map(toPublicAttendee);
    })
  );
}

module.exports = createCoreController('api::event.event', ({ strapi }) => ({
  async find(ctx) {
    const scope = await buildEventVisibilityFilter(strapi, ctx.state.user);
    if (scope) {
      ctx.query = {
        ...ctx.query,
        filters: { $and: [ctx.query.filters || {}, scope] },
      };
    }
    const response = await super.find(ctx);
    if (Array.isArray(response?.data)) {
      await attachPublicAttendees(strapi, response.data);
    }
    return response;
  },

  async findOne(ctx) {
    const { id: documentId } = ctx.params;
    const entity = await strapi.documents('api::event.event').findOne({
      documentId,
      populate: ['group', 'group.manager', 'submittedBy'],
    });

    if (!entity) {
      return ctx.notFound();
    }

    const visible = await isEventVisible(strapi, ctx.state.user, entity);
    if (!visible) {
      return ctx.notFound();
    }

    const response = await super.findOne(ctx);
    if (response?.data) {
      await attachPublicAttendees(strapi, response.data);
    }
    return response;
  },

  async create(ctx) {
    const { user } = ctx.state;
    const student = await getAuthenticatedStudent(strapi, user);
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    if (isCoordinator(user)) {
      if (!data.submittedBy && student) {
        data.submittedBy = student.documentId;
      }
      delete data.attendees;
      ctx.request.body = { ...body, data };
      return super.create(ctx);
    }

    // Only Group Managers and Coordinators have create permission on Event.
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const groupDocumentId = extractRelationDocumentId(data.group);
    const managesGroup = await isManagerOfGroup(strapi, student, groupDocumentId);
    if (!managesGroup) {
      return ctx.forbidden('You can only submit events for groups you manage.');
    }

    data.status = 'pending';
    data.submittedBy = student.documentId;
    delete data.approvedBy;
    delete data.attendees;

    ctx.request.body = { ...body, data };
    return super.create(ctx);
  },

  async update(ctx) {
    const { user } = ctx.state;
    const { id: documentId } = ctx.params;
    const body = ctx.request.body || {};
    const data = { ...(body.data || {}) };

    const existing = await strapi.documents('api::event.event').findOne({
      documentId,
      populate: ['group'],
    });
    if (!existing) {
      return ctx.notFound();
    }

    if (isCoordinator(user)) {
      if (data.status && ['approved', 'rejected'].includes(data.status) && !data.approvedBy) {
        const coordinatorStudent = await getAuthenticatedStudent(strapi, user);
        if (coordinatorStudent) {
          data.approvedBy = coordinatorStudent.documentId;
        }
      }
      delete data.attendees;
      ctx.request.body = { ...body, data };
      return super.update(ctx);
    }

    // Group Manager path: scoped to groups they manage, cannot touch the approval fields.
    const student = await getAuthenticatedStudent(strapi, user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const managesCurrentGroup = await isManagerOfGroup(strapi, student, existing.group?.documentId);
    if (!managesCurrentGroup) {
      return ctx.forbidden('You can only manage events for groups you manage.');
    }

    if (data.group) {
      const targetGroupId = extractRelationDocumentId(data.group);
      const managesTargetGroup = await isManagerOfGroup(strapi, student, targetGroupId);
      if (!managesTargetGroup) {
        return ctx.forbidden('You cannot move this event to a group you do not manage.');
      }
    }

    delete data.status;
    delete data.approvedBy;
    delete data.attendees;

    ctx.request.body = { ...body, data };
    return super.update(ctx);
  },

  /** Lets the authenticated student RSVP to (attend) an event. Publicly visible, like Group membership. */
  async attend(ctx) {
    const student = await getAuthenticatedStudent(strapi, ctx.state.user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const { id: documentId } = ctx.params;
    const event = await strapi.documents('api::event.event').findOne({ documentId });
    if (!event) {
      return ctx.notFound('Event not found.');
    }

    const updated = await strapi.documents('api::event.event').update({
      documentId,
      data: { attendees: { connect: [{ documentId: student.documentId }] } },
      populate: ['attendees'],
    });

    ctx.body = { data: await this.sanitizeOutput(updated, ctx) };
  },

  /** Lets the authenticated student cancel their RSVP. */
  async unattend(ctx) {
    const student = await getAuthenticatedStudent(strapi, ctx.state.user);
    if (!student) {
      return ctx.forbidden('No student profile is linked to this account.');
    }

    const { id: documentId } = ctx.params;
    const event = await strapi.documents('api::event.event').findOne({ documentId });
    if (!event) {
      return ctx.notFound('Event not found.');
    }

    const updated = await strapi.documents('api::event.event').update({
      documentId,
      data: { attendees: { disconnect: [{ documentId: student.documentId }] } },
      populate: ['attendees'],
    });

    ctx.body = { data: await this.sanitizeOutput(updated, ctx) };
  },
}));
