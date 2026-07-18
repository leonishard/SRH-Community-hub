'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/events/:id/attend',
      handler: 'event.attend',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/events/:id/unattend',
      handler: 'event.unattend',
      config: {
        policies: [],
      },
    },
  ],
};
