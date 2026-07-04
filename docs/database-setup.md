# Database Setup

This project uses Supabase PostgreSQL with Prisma.

## Current Local Database

The active local database for this project is a dedicated PostgreSQL container:

```text
workspace-booking-postgres
postgres:15-alpine
127.0.0.1:55432 -> 5432
```

Do not use or modify `finix-postgres`; it belongs to another project.

Start the project database:

```bash
npm run db:start
```

Stop only the project database:

```bash
npm run db:stop
```

Check status:

```bash
npm run db:status
```

If the container does not exist yet, create it with:

```bash
docker run --name workspace-booking-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=workspace_booking -p 55432:5432 -d postgres:15-alpine
```

Then apply Prisma migrations and seed demo data:

```bash
npm run prisma:deploy
npm run prisma:seed
```

## Local Supabase

Start Docker Desktop first, then run:

```bash
npm run supabase:start
```

When Supabase starts successfully, copy the printed service role key into `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY="paste-from-supabase-start-output"
```

Then apply Prisma migrations and seed demo data:

```bash
npm run prisma:deploy
npm run prisma:seed
```

Useful local commands:

```bash
npm run db:status
npm run db:stop
npm run db:reset
```

## Local Environment

Default local database values:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/workspace_booking?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:55432/workspace_booking?schema=public"
SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_STORAGE_BUCKET="workspace-booking"
```

## Cloud Supabase

For Supabase Cloud, use the project connection strings:

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-...pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[service-role-key]"
```

Then run:

```bash
npm run prisma:deploy
npm run prisma:seed
```

## Current Local Docker Note

During setup on this machine, `supabase start` failed while pulling `supabase/postgres:17.6.1.140` because Docker Desktop reported a missing image layer/blob in its content store.

Observed error:

```text
failed to extract layer ... blob not found
```

If this repeats, the fix is usually Docker Desktop cleanup/restart:

1. Restart Docker Desktop.
2. Run `npm run db:start` again.
3. If the same blob error repeats, use Docker Desktop > Troubleshoot > Clean / Purge data, then retry.

Do not run a broad Docker prune command unless you are comfortable removing unused local Docker images and caches.
