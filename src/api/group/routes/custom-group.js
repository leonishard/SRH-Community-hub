'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/groups/:id/join',
      handler: 'group.join',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/groups/:id/leave',
      handler: 'group.leave',
      config: {
        policies: [],
      },
    },
  ],
};
