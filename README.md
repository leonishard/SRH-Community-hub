# SRH-Community-hub

Strapi 5 backend for the **SRH Ambassador Hub** community app.

## Content types

- **Student** — name, email, profilePicture, bio, program
- **Group** — name, description, category, coverImage, manager (→ Student)
- **Event** — title, description, date, location, status (pending/approved/rejected), group, submittedBy, approvedBy
- **Post** — content, group, author (→ Student; named `author` since `createdBy` is a Strapi-reserved field name)
- **Friendship** — requester, addressee (both → Student), status (pending/accepted); models the self-referential Student↔Student many-to-many
- **Membership** — native Student↔Group many-to-many (`Group.members` / `Student.groups`)

Every Student is linked one-to-one to a `plugin::users-permissions.user` account via the `user` field, so API auth (login/roles) and profile data stay separate but connected.

## Roles

- **Public** — read-only Group/Event/Post (Events filtered to `status: approved`)
- **Authenticated** — same reads, plus manage own Friendship requests and Group membership (`POST /api/groups/:id/join` / `/leave`)
- **Group Manager** — Authenticated, plus create/update Event and Post scoped to groups they manage; new Events are forced to `status: pending` and Group Managers cannot edit `status`/`approvedBy`
- **Coordinator** — full CRUD everywhere, including approving/rejecting Events (auto-fills `approvedBy` on status change)

Roles, permissions, and the two custom roles (Group Manager, Coordinator) are created/reconciled automatically on every boot by `src/index.js`. Ownership scoping lives in the controllers (`src/api/*/controllers`, `src/utils/`).

## Local setup

```bash
npm install
npm run develop   # starts the API + admin at http://localhost:1337/admin
```

On first run, create an admin user at `/admin` (this is the Strapi admin account, separate from Student/API users).

Then seed local test data (safe to re-run):

```bash
npm run seed
```

This creates 8 students (1 Coordinator, 3 Group Managers, 4 plain Students), 3 groups, 6 events (mixed pending/approved/rejected), 5 posts, and 4 friendships. All seeded student accounts share the password `Password123!` — log in via `POST /api/auth/local` with the student's email.
