# Deployment

This repo is split into:

- `frontend`: Next.js app for Vercel
- `backend`: NestJS API for Render
- Supabase Postgres used through Prisma

## Supabase

The Supabase project is `League` (`yahxuedqwurrfmsjtzal`) in `ap-south-1`.
Its schema migration and demo seed data have already been applied.

Copy its Postgres connection strings from Supabase:

- `DATABASE_URL`: the pooled connection string for runtime queries
- `DIRECT_URL`: the direct connection string for Prisma migrations

The previously connected Supabase project `hrhedxchjjzevzmjdxpf` is inactive and Supabase reported that it cannot be restored because it has been paused for more than 90 days.

## Render Backend

Use the root `render.yaml` Blueprint. During Blueprint creation, fill these secrets:

- `DATABASE_URL`
- `DIRECT_URL`
- `FRONTEND_URL`, after the Vercel URL is known

The backend exposes `/api/health` for Render health checks.

## Vercel Frontend

Deploy from the `frontend` directory, or set the Git project root directory to `frontend`.

Set:

- `NEXT_PUBLIC_API_URL=https://<render-backend-host>/api`
- `NEXT_PUBLIC_SOCKET_URL=https://<render-backend-host>`
