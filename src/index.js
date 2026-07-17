'use strict';

/**
 * Desired action-level permissions per role, expressed as
 * { <api folder name>: [<controller action names>] }.
 * Anything not listed here is left untouched (so manual tweaks made later
 * in the admin UI are never clobbered by a restart).
 */
/**
 * Plugin actions each custom role needs beyond our own api::* content types.
 * `users-permissions.user.me` is auto-granted to the built-in Public/Authenticated
 * roles by the plugin itself, but NOT to roles we create ourselves — without this,
 * Group Managers/Coordinators get a 403 from `/api/users/me` despite a valid JWT.
 */
const PLUGIN_PERMISSIONS = {
  group_manager: { 'users-permissions': { user: ['me'] } },
  coordinator: { 'users-permissions': { user: ['me'] } },
};

const ROLE_PERMISSIONS = {
  public: {
    group: ['find', 'findOne'],
    event: ['find', 'findOne'],
    post: ['find', 'findOne'],
  },
  authenticated: {
    student: ['find', 'findOne', 'me'],
    group: ['find', 'findOne', 'join', 'leave'],
    event: ['find', 'findOne'],
    post: ['find', 'findOne'],
    friendship: ['find', 'findOne', 'create', 'update', 'delete'],
  },
  group_manager: {
    student: ['find', 'findOne', 'me'],
    group: ['find', 'findOne', 'join', 'leave'],
    event: ['find', 'findOne', 'create', 'update'],
    post: ['find', 'findOne', 'create', 'update'],
    friendship: ['find', 'findOne', 'create', 'update', 'delete'],
  },
  coordinator: {
    student: ['find', 'findOne', 'create', 'update', 'delete', 'me'],
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

function applyPluginPermissions(permissionTree, pluginSpec) {
  for (const [pluginName, controllers] of Object.entries(pluginSpec)) {
    const pluginKey = `plugin::${pluginName}`;
    for (const [controllerName, actions] of Object.entries(controllers)) {
      for (const action of actions) {
        const actionEntry = permissionTree[pluginKey]?.controllers?.[controllerName]?.[action];
        if (actionEntry) {
          actionEntry.enabled = true;
        } else {
          strapi.log.warn(
            `[bootstrap] Could not find plugin permission ${pluginKey}.controllers.${controllerName}.${action} - skipping.`
          );
        }
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
    { id: publicRole.id, spec: ROLE_PERMISSIONS.public, pluginSpec: PLUGIN_PERMISSIONS.public },
    { id: authenticatedRole.id, spec: ROLE_PERMISSIONS.authenticated, pluginSpec: PLUGIN_PERMISSIONS.authenticated },
    { id: groupManagerRoleId, spec: ROLE_PERMISSIONS.group_manager, pluginSpec: PLUGIN_PERMISSIONS.group_manager },
    { id: coordinatorRoleId, spec: ROLE_PERMISSIONS.coordinator, pluginSpec: PLUGIN_PERMISSIONS.coordinator },
  ];

  for (const { id, spec, pluginSpec } of roleTargets) {
    const role = await roleService.findOne(id);
    applyPermissions(role.permissions, spec);
    if (pluginSpec) {
      applyPluginPermissions(role.permissions, pluginSpec);
    }
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
