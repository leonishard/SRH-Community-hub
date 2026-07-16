'use strict';

/**
 * Desired action-level permissions per role, expressed as
 * { <api folder name>: [<controller action names>] }.
 * Anything not listed here is left untouched (so manual tweaks made later
 * in the admin UI are never clobbered by a restart).
 */
const ROLE_PERMISSIONS = {
  public: {
    group: ['find', 'findOne'],
    event: ['find', 'findOne'],
    post: ['find', 'findOne'],
  },
  authenticated: {
    student: ['find', 'findOne'],
    group: ['find', 'findOne', 'join', 'leave'],
    event: ['find', 'findOne'],
    post: ['find', 'findOne'],
    friendship: ['find', 'findOne', 'create', 'update', 'delete'],
  },
  group_manager: {
    student: ['find', 'findOne'],
    group: ['find', 'findOne', 'join', 'leave'],
    event: ['find', 'findOne', 'create', 'update'],
    post: ['find', 'findOne', 'create', 'update'],
    friendship: ['find', 'findOne', 'create', 'update', 'delete'],
  },
  coordinator: {
    student: ['find', 'findOne', 'create', 'update', 'delete'],
    group: ['find', 'findOne', 'create', 'update', 'delete', 'join', 'leave'],
    event: ['find', 'findOne', 'create', 'update', 'delete'],
    post: ['find', 'findOne', 'create', 'update', 'delete'],
    friendship: ['find', 'findOne', 'create', 'update', 'delete'],
  },
};

function applyPermissions(permissionTree, spec) {
  for (const [apiName, actions] of Object.entries(spec)) {
    const apiKey = `api::${apiName}`;
    for (const action of actions) {
      const actionEntry = permissionTree[apiKey]?.controllers?.[apiName]?.[action];
      if (actionEntry) {
        actionEntry.enabled = true;
      } else {
        strapi.log.warn(
          `[bootstrap] Could not find permission ${apiKey}.controllers.${apiName}.${action} - skipping.`
        );
      }
    }
  }
}

/** Finds an existing custom role by its `type` slug, creating it (with empty permissions) if missing. */
async function ensureRole(strapi, { name, description, type }) {
  const roleService = strapi.plugin('users-permissions').service('role');
  const roles = await roleService.find();
  const existing = roles.find((role) => role.type === type);
  if (existing) {
    return existing.id;
  }

  await roleService.createRole({ name, description, type, permissions: {} });
  const created = (await roleService.find()).find((role) => role.type === type);
  return created.id;
}

async function configureRolesAndPermissions(strapi) {
  const roleService = strapi.plugin('users-permissions').service('role');

  const existingRoles = await roleService.find();
  const publicRole = existingRoles.find((role) => role.type === 'public');
  const authenticatedRole = existingRoles.find((role) => role.type === 'authenticated');

  const groupManagerRoleId = await ensureRole(strapi, {
    name: 'Group Manager',
    description:
      'Student who manages one or more groups: everything a Student can do, plus create/update Posts and Events for the group(s) they manage.',
    type: 'group_manager',
  });
  const coordinatorRoleId = await ensureRole(strapi, {
    name: 'Coordinator',
    description:
      'Full CRUD across all Ambassador Hub content, including approving/rejecting pending Events.',
    type: 'coordinator',
  });

  const roleTargets = [
    { id: publicRole.id, spec: ROLE_PERMISSIONS.public },
    { id: authenticatedRole.id, spec: ROLE_PERMISSIONS.authenticated },
    { id: groupManagerRoleId, spec: ROLE_PERMISSIONS.group_manager },
    { id: coordinatorRoleId, spec: ROLE_PERMISSIONS.coordinator },
  ];

  for (const { id, spec } of roleTargets) {
    const role = await roleService.findOne(id);
    applyPermissions(role.permissions, spec);
    await roleService.updateRole(id, {
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
  }

  strapi.log.info('[bootstrap] Ambassador Hub roles & permissions configured.');
}

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    await configureRolesAndPermissions(strapi);
  },
};
