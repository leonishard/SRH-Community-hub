'use strict';

/**
 * Seeds local test data for the SRH Ambassador Hub.
 * Safe to re-run: every record is looked up by a natural key first and
 * only created if missing, so re-seeding never duplicates data.
 *
 * Usage: npm run seed
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const SEED_PASSWORD = 'Password123!';

const STUDENTS = [
  {
    key: 'alice',
    name: 'Alice Nguyen',
    email: 'alice.coordinator@srh.edu',
    bio: 'Ambassador Hub coordinator overseeing groups and event approvals.',
    program: 'MSc Information Systems',
    roleType: 'coordinator',
  },
  {
    key: 'ben',
    name: 'Ben Fischer',
    email: 'ben.fischer@stud.srh.edu',
    bio: 'Robotics enthusiast running the Robotics Club.',
    program: 'BSc Computer Science',
    roleType: 'group_manager',
  },
  {
    key: 'carla',
    name: 'Carla Weber',
    email: 'carla.weber@stud.srh.edu',
    bio: 'Photographer and manager of the Photography Society.',
    program: 'BA Media Design',
    roleType: 'group_manager',
  },
  {
    key: 'diego',
    name: 'Diego Alvarez',
    email: 'diego.alvarez@stud.srh.edu',
    bio: 'Outdoors lover leading the Hiking Crew.',
    program: 'BSc Business Administration',
    roleType: 'group_manager',
  },
  {
    key: 'elena',
    name: 'Elena Rossi',
    email: 'elena.rossi@stud.srh.edu',
    bio: 'Second-year student interested in robotics and photography.',
    program: 'BSc Computer Science',
    roleType: 'authenticated',
  },
  {
    key: 'finn',
    name: 'Finn Becker',
    email: 'finn.becker@stud.srh.edu',
    bio: 'Enjoys photography and weekend hikes.',
    program: 'BA International Business',
    roleType: 'authenticated',
  },
  {
    key: 'grace',
    name: 'Grace Adeyemi',
    email: 'grace.adeyemi@stud.srh.edu',
    bio: 'Robotics Club member and hiking regular.',
    program: 'BSc Mechatronics',
    roleType: 'authenticated',
  },
  {
    key: 'hassan',
    name: 'Hassan Ali',
    email: 'hassan.ali@stud.srh.edu',
    bio: 'Ambassador Hub member active across several groups.',
    program: 'MSc Data Science',
    roleType: 'authenticated',
  },
];

const GROUPS = [
  {
    key: 'robotics',
    name: 'Robotics Club',
    description: 'Building and programming robots together, from line followers to full autonomy.',
    category: 'Technology',
    managerKey: 'ben',
    memberKeys: ['ben', 'elena', 'grace', 'hassan'],
  },
  {
    key: 'photography',
    name: 'Photography Society',
    description: 'Weekly photo walks, gear talk, and portfolio critiques.',
    category: 'Arts',
    managerKey: 'carla',
    memberKeys: ['carla', 'elena', 'finn', 'hassan'],
  },
  {
    key: 'hiking',
    name: 'Hiking Crew',
    description: 'Weekend hikes around the region for all fitness levels.',
    category: 'Outdoors',
    managerKey: 'diego',
    memberKeys: ['diego', 'finn', 'grace', 'hassan'],
  },
];

const EVENTS = [
  {
    title: 'Robotics Kickoff Workshop',
    description: 'Intro session covering the semester roadmap and starter kits.',
    date: '2026-08-05T16:00:00.000Z',
    location: 'Building A, Room 101',
    groupKey: 'robotics',
    submittedByKey: 'ben',
    status: 'approved',
    approvedByKey: 'alice',
  },
  {
    title: 'Line-Following Bot Competition',
    description: 'Friendly competition to test line-following bots built this semester.',
    date: '2026-09-12T15:00:00.000Z',
    location: 'Robotics Lab',
    groupKey: 'robotics',
    submittedByKey: 'ben',
    status: 'pending',
  },
  {
    title: 'Golden Hour Photo Walk',
    description: 'Group walk through the old town at golden hour.',
    date: '2026-08-14T18:30:00.000Z',
    location: 'Old Town Square',
    groupKey: 'photography',
    submittedByKey: 'carla',
    status: 'approved',
    approvedByKey: 'alice',
  },
  {
    title: 'Studio Lighting Masterclass',
    description: 'Hands-on studio lighting session; postponed pending equipment budget.',
    date: '2026-09-01T17:00:00.000Z',
    location: 'Media Studio 2',
    groupKey: 'photography',
    submittedByKey: 'carla',
    status: 'rejected',
    approvedByKey: 'alice',
  },
  {
    title: 'Sunrise Summit Hike',
    description: 'Early start to catch the sunrise from the ridge trail.',
    date: '2026-08-22T05:30:00.000Z',
    location: 'Ridge Trailhead',
    groupKey: 'hiking',
    submittedByKey: 'diego',
    status: 'approved',
    approvedByKey: 'alice',
  },
  {
    title: 'Night Hike Under the Stars',
    description: 'Evening hike with a stop for stargazing, awaiting approval.',
    date: '2026-09-20T20:00:00.000Z',
    location: 'Forest Loop Trail',
    groupKey: 'hiking',
    submittedByKey: 'diego',
    status: 'pending',
  },
];

const POSTS = [
  {
    groupKey: 'robotics',
    authorKey: 'ben',
    content: 'Welcome to the Robotics Club! Drop your intro below and grab a starter kit at the next meeting.',
  },
  {
    groupKey: 'robotics',
    authorKey: 'elena',
    content: "Excited for the kickoff workshop, see everyone there!",
  },
  {
    groupKey: 'photography',
    authorKey: 'carla',
    content: "Check out the gallery from last week's shoot in the shared drive.",
  },
  {
    groupKey: 'hiking',
    authorKey: 'diego',
    content: 'Pack your boots, the sunrise hike is confirmed for the approved date.',
  },
  {
    groupKey: 'hiking',
    authorKey: 'grace',
    content: "Can't wait for this one, bringing snacks for everyone!",
  },
];

const FRIENDSHIPS = [
  { requesterKey: 'elena', addresseeKey: 'grace', status: 'accepted' },
  { requesterKey: 'finn', addresseeKey: 'hassan', status: 'pending' },
  { requesterKey: 'grace', addresseeKey: 'diego', status: 'pending' },
  { requesterKey: 'ben', addresseeKey: 'carla', status: 'accepted' },
];

async function findRoleId(strapi, roleType) {
  const roleService = strapi.plugin('users-permissions').service('role');
  const roles = await roleService.find();
  const role = roles.find((r) => r.type === roleType);
  if (!role) {
    throw new Error(`Role of type "${roleType}" not found. Start the app once so bootstrap() can create it.`);
  }
  return role.id;
}

async function findOrCreateUser(strapi, { name, email, roleId }) {
  const existing = await strapi.documents('plugin::users-permissions.user').findMany({
    filters: { email },
    limit: 1,
  });
  if (existing[0]) {
    return existing[0];
  }

  const userService = strapi.plugin('users-permissions').service('user');
  return userService.add({
    username: email,
    email,
    password: SEED_PASSWORD,
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: roleId,
  });
}

async function findOrCreateStudent(strapi, { name, email, bio, program, userDocumentId }) {
  const existing = await strapi.documents('api::student.student').findMany({
    filters: { email },
    limit: 1,
  });
  if (existing[0]) {
    return existing[0];
  }

  return strapi.documents('api::student.student').create({
    data: { name, email, bio, program, user: userDocumentId },
  });
}

async function findOrCreateGroup(strapi, { name, description, category, managerDocumentId, memberDocumentIds }) {
  const existing = await strapi.documents('api::group.group').findMany({
    filters: { name },
    limit: 1,
  });
  if (existing[0]) {
    return existing[0];
  }

  return strapi.documents('api::group.group').create({
    data: { name, description, category, manager: managerDocumentId, members: memberDocumentIds },
  });
}

async function findOrCreateEvent(strapi, data) {
  const existing = await strapi.documents('api::event.event').findMany({
    filters: { title: data.title },
    limit: 1,
  });
  if (existing[0]) {
    return existing[0];
  }

  return strapi.documents('api::event.event').create({ data });
}

async function findOrCreatePost(strapi, { groupDocumentId, authorDocumentId, content }) {
  const existing = await strapi.documents('api::post.post').findMany({
    filters: { content, group: { documentId: groupDocumentId } },
    limit: 1,
  });
  if (existing[0]) {
    return existing[0];
  }

  return strapi.documents('api::post.post').create({
    data: { content, group: groupDocumentId, author: authorDocumentId },
  });
}

async function findOrCreateFriendship(strapi, { requesterDocumentId, addresseeDocumentId, status }) {
  const existing = await strapi.documents('api::friendship.friendship').findMany({
    filters: {
      requester: { documentId: requesterDocumentId },
      addressee: { documentId: addresseeDocumentId },
    },
    limit: 1,
  });
  if (existing[0]) {
    return existing[0];
  }

  return strapi.documents('api::friendship.friendship').create({
    data: { requester: requesterDocumentId, addressee: addresseeDocumentId, status },
  });
}

async function seed() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const roleIds = {
      authenticated: await findRoleId(app, 'authenticated'),
      group_manager: await findRoleId(app, 'group_manager'),
      coordinator: await findRoleId(app, 'coordinator'),
    };

    const studentsByKey = {};
    for (const s of STUDENTS) {
      const user = await findOrCreateUser(app, {
        name: s.name,
        email: s.email,
        roleId: roleIds[s.roleType],
      });
      const student = await findOrCreateStudent(app, {
        name: s.name,
        email: s.email,
        bio: s.bio,
        program: s.program,
        userDocumentId: user.documentId,
      });
      studentsByKey[s.key] = student;
      console.log(`Student ready: ${s.name} (${s.roleType})`);
    }

    const groupsByKey = {};
    for (const g of GROUPS) {
      const group = await findOrCreateGroup(app, {
        name: g.name,
        description: g.description,
        category: g.category,
        managerDocumentId: studentsByKey[g.managerKey].documentId,
        memberDocumentIds: g.memberKeys.map((k) => studentsByKey[k].documentId),
      });
      groupsByKey[g.key] = group;
      console.log(`Group ready: ${g.name}`);
    }

    for (const e of EVENTS) {
      await findOrCreateEvent(app, {
        title: e.title,
        description: e.description,
        date: e.date,
        location: e.location,
        status: e.status,
        group: groupsByKey[e.groupKey].documentId,
        submittedBy: studentsByKey[e.submittedByKey].documentId,
        approvedBy: e.approvedByKey ? studentsByKey[e.approvedByKey].documentId : undefined,
      });
      console.log(`Event ready: ${e.title} [${e.status}]`);
    }

    for (const p of POSTS) {
      await findOrCreatePost(app, {
        groupDocumentId: groupsByKey[p.groupKey].documentId,
        authorDocumentId: studentsByKey[p.authorKey].documentId,
        content: p.content,
      });
      console.log(`Post ready in ${p.groupKey}: "${p.content.slice(0, 40)}..."`);
    }

    for (const f of FRIENDSHIPS) {
      await findOrCreateFriendship(app, {
        requesterDocumentId: studentsByKey[f.requesterKey].documentId,
        addresseeDocumentId: studentsByKey[f.addresseeKey].documentId,
        status: f.status,
      });
      console.log(`Friendship ready: ${f.requesterKey} -> ${f.addresseeKey} [${f.status}]`);
    }

    console.log('\nSeed complete.');
    console.log(`All seeded student accounts share the password: ${SEED_PASSWORD}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

seed();
