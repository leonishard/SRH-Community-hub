'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/students/me',
      handler: 'student.me',
      config: {
        policies: [],
      },
    },
  ],
};
