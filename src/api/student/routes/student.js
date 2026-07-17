'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::student.student', {
  config: {
    update: {
      policies: ['global::is-own-student-profile'],
    },
  },
});
