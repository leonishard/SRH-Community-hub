'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::comment.comment', {
  config: {
    create: {
      policies: ['global::is-group-member-for-post'],
    },
  },
});
