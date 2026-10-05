# TaskHub Pro

Task management app with org-scoped RBAC.

```
backend/   Express API
client/     React frontend
prisma/     schema and seed
```

## Tech stack

**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL (local or Neon), JWT, bcryptjs

**Frontend:** React, Vite, TypeScript, React Router, Axios, CSS

## Setup

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to PostgreSQL. Local or Neon both work:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/taskhub_pro?schema=public"
```

Neon example:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

4. Keep `JWT_SECRET` set. `CLIENT_ORIGIN` defaults to `http://localhost:5173`.

From the project root:

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
```

```bash
cd client
npm install
```

## Run

API from the project root (http://localhost:4000):

```bash
npm run dev
```

Client (http://localhost:5173):

```bash
cd client
npm run dev
```

Inspect data:

```bash
npx prisma studio
```

## Seed logins

Password for every user: `Password1!`

| Email | Role | Org |
|---|---|---|
| `admin@orga.com` | ADMIN | orgA |
| `manager@orga.com` | MANAGER | orgA |
| `user1@orga.com` | USER | orgA |
| `user2@orga.com` | USER | orgA |
| `user3@orgb.com` | USER | orgB |
| `user4@orgb.com` | USER | orgB |

## Access

- **USER:** own tasks only (`My Tasks`)
- **MANAGER:** tasks in own org (`My Tasks`, `Org Tasks`)
- **ADMIN:** all tasks (`My Tasks`, `Org Tasks`, `All Tasks`)

RBAC is enforced in backend queries and writes, not only in the UI.

## API

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | no |
| POST | `/auth/login` | no |
| POST | `/auth/refresh` | no |
| GET | `/tasks` | yes |
| POST | `/tasks` | yes |
| PATCH | `/tasks/bulk` | yes |
| PATCH | `/tasks/:id` | yes |
| DELETE | `/tasks/:id` | yes |

`GET /tasks` query params: `scope` (`mine` \| `org` \| `all`), `status`, `priority`, `tags`, `q`, `cursor`, `limit` (default 20).

Response: `{ items, nextCursor, hasMore }`.

Bulk body:

```json
{
  "ids": [],
  "set": { "status": "DONE", "priority": "HIGH" }
}
```

JWT claims: `sub`, `email`, `orgId`, `roles`.
