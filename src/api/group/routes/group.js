'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::group.group', {
  config: {
    update: {
      policies: ['global::is-own-group-manager'],
    },
  },
});
