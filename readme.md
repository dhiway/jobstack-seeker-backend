# JOBSTACK SEEKER BACKEND

---

## 🚀 Setup

1. **Install PNPM**

   ```bash
   # macOS
   brew add pnpm

   # Linux
   npm install -g pnpm
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run Docker**

   ### Production

   ```bash
   docker compose up --build -d
   ```

   ### Development

   For local testing or development few changes are required in `.env`. instead
   of making changes to `.env`. create a `.env.local`

   ```env
    BETTER_AUTH_URL=http://localhost:3002/api/v1/auth # Local backend endpoint
    NODE_ENV = "development"
   ```

   ```bash
   docker compose --env-file .env.local up --build
   ```

   - `-d` runs containers in detached mode.

   - `--build` ensures the image is built or rebuilt as needed.

   > ✅ **Note:** If you face migration errors locally, purge local Docker
   > volumes **(local only!)** to reset the DB: For Server use the method
   > decribed in at **Drizzle Migration Creation / Error Fix** in next section

   ```bash
   docker compose down --volumes
   ```

---

## 🗂️ Database Schema

- **DB Schemas:**

  - `db/schema` → main DB table definitions
  - `drizzle` → Drizzle migrations & configs

- **Better Auth Schema Generation**

  ```bash
  npx @better-auth/cli generate
  ```

- **Drizzle Studio** Stop local PostgreSQL if running:

  ```bash
  brew services stop postgresql
  pnpm drizzle-kit studio
  ```

- **Drizzle Migration Creation / Error Fix**

  1. Fresh Server

  - Make sure the docker container postgres is running.
  - Run `db:generate` script and then run db:migrate to create and apply the
    schema migrations.

  2. Database Volume Exists

  - Delete drizzle folder if migration errors occur. (NOTE: Do not delete if
    these error occur due to value type issues. Instead fix the issues)
  - Run `db:pull` script which will create the following: `drizzle/schema.ts`
    `drizzle/relations.ts` `drizzle/0000_*.sql` `drizzle/meta/0000_*.json`
    `drizzle/meta/_journal.json`
  - Delete both `drizzle/0000_*.sql` `drizzle/meta/0000_*.json`
  - Edit `drizzle/meta/_journal.json` and delete the entries for idx:0

    ```json
    {
      "version": "7",
      "dialect": "postgresql",
      "entries": [
        {
          "idx": 0,
          "version": "7",
          "when": 1754329815357,
          "tag": "0000_*",
          "breakpoints": true
        }
      ]
    }
    ```

    - Run `db:generate` script and then `db:migrate`

---

## 🗄️ Sandbox Database Setup

The sandbox database is a sanitized replica of the production database designed for safe integration with MindsDB and other analytics tools. All PII (Personally Identifiable Information) is anonymized using consistent hashing.

### Features

- **Separate Database Instance**: Isolated PostgreSQL database for analytics
- **PII Anonymization**: All sensitive data is hashed/anonymized consistently
- **Referential Integrity**: Foreign key relationships are maintained
- **Location Data Preserved**: Location data (address, pincode, GPS, city, state, country) is kept as-is for visualizations and reports
- **Scheduled Sync**: Can be automated via cron jobs

### Environment Variables

| Variable                  | Description                                          | Default Value                              |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| `SANDBOX_POSTGRES_USER`   | Username for the sandbox PostgreSQL instance.        | `sandbox_user`                             |
| `SANDBOX_POSTGRES_PASSWORD` | Password for the sandbox PostgreSQL user.         | `sandbox_password`                          |
| `SANDBOX_POSTGRES_DB`     | Name of the sandbox database.                        | `jobstack_seeker_sandbox`                   |
| `SANDBOX_DATABASE_PORT`   | Sandbox PostgreSQL port (default: 5433).           | `5433`                                     |
| `SANDBOX_DATABASE_URL`    | Connection URL for sandbox database.                 | `postgres://sandbox_user:sandbox_password@localhost:5433/jobstack_seeker_sandbox` |
| `SANDBOX_SALT`            | Salt for anonymization hashing (change in production). | `your-random-salt-string`                |

**Note:** The sandbox database contains a sanitized replica of production data with all PII anonymized. See [Sandbox Database Setup](#-sandbox-database-setup) section for details.

### Setup Instructions

1. **Start the sandbox database** (included in docker-compose):

   ```bash
   docker compose up sandbox-db -d
   ```

2. **Configure environment variables** in your `.env` file:

   ```env
   SANDBOX_DATABASE_URL=postgres://sandbox_user:sandbox_password@localhost:5433/jobstack_seeker_sandbox
   SANDBOX_SALT=your-random-salt-string-change-this-in-production
   ```

   Or use individual components:

   ```env
   SANDBOX_POSTGRES_USER=sandbox_user
   SANDBOX_POSTGRES_PASSWORD=sandbox_password
   SANDBOX_POSTGRES_DB=jobstack_seeker_sandbox
   SANDBOX_DATABASE_PORT=5433
   SANDBOX_SALT=your-random-salt-string-change-this-in-production
   ```

3. **Initialize the sandbox schema**:

   ```bash
   pnpm sandbox:setup
   ```

4. **Sync data with anonymization**:

   ```bash
   pnpm sandbox:sync
   ```

### What Data is Included/Excluded

**Included Tables** (with sanitization):
- `user` - anonymized email, phone_number, name, user_id
- `organization` - kept as-is (non-PII)
- `job_posting` - kept as-is (non-PII)
- `job_application` - anonymized user_name, user_id, sanitized contact JSONB, **location JSONB kept as-is**
- `location` - anonymized user_id only, **all location data kept as-is** (address, pincode, GPS, city, state, country)
- `contact` - anonymized email, phone_number array, user_id
- `profile` - anonymized user_id, sanitized metadata JSONB (removes user PII, **keeps location data**)
- `profile_location`, `profile_contact` - kept as-is (junction tables)
- `member`, `team`, `team_member` - anonymized user_id references
- `guardian_consent` - anonymized user_email, user_phone, guardian_name, guardian_email, guardian_phone
- `minor_job_application_consent` - anonymized user_id, profile_id, guardian_id
- `user_consent` - anonymized user_id
- `application_consent` - anonymized seeker_id, guardian_consent_id

**Excluded Tables** (sensitive data):
- `account` - contains tokens/passwords
- `verification` - contains sensitive verification data
- `apikey` - contains API keys
- `invitation` - contains emails

### Anonymization Strategy

- **Emails**: Hashed while preserving format (e.g., `abc123@def456.com`)
- **Phone Numbers**: Hashed while preserving format (e.g., `+12-3456-7890`)
- **Names**: Replaced with `User_[hash]`
- **User IDs**: Hashed consistently to maintain referential integrity
- **Location Data**: **Kept as-is** (address, pincode, GPS coordinates, city, state, country) - needed for visualizations and reports
- **JSONB Fields**: Recursively sanitized for nested PII, but location-related data is preserved

### Automated Sync (Cron Job)

To set up automated daily sync, add to your crontab:

```bash
# Sync sandbox database daily at 2 AM
0 2 * * * cd /path/to/jobstack-seeker-backend && pnpm sandbox:sync >> /var/log/sandbox-sync.log 2>&1
```

Or use a cron container in docker-compose (optional).

### Drizzle Studio for Sandbox

To inspect the sandbox database using Drizzle Studio:

```bash
pnpm db:studio:sandbox
```

This will open Drizzle Studio on port 4984, connected to the sandbox database.

### Troubleshooting

**Connection Issues**:
- Verify sandbox-db container is running: `docker ps | grep sandbox-db`
- Check connection string format in `SANDBOX_DATABASE_URL`
- Ensure port 5433 is accessible (or configured port)

**Sync Errors**:
- Verify `DATABASE_URL` points to source database
- Check `SANDBOX_SALT` is set
- Ensure source database is accessible
- Run `pnpm sandbox:sync` to refresh data
- Check if tables exist: `docker exec -it jobstack-seeker-sandbox-db psql -U sandbox_user -d jobstack_seeker_sandbox -c "\dt"`

**Data Issues**:
- Verify anonymization is working: Check user table for hashed emails/phones
- Check referential integrity: User IDs should be consistently hashed across tables
- Verify location data is preserved: Check location table for original addresses/pincodes

---

## ⚡ Drizzle Commands

| Command                | When to Use                                                                 | What It Does                                                                                           |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `drizzle-kit generate` | When you **change your schema**                                             | Generates a new SQL migration file based on changes in your Drizzle schema                             |
| `drizzle-kit migrate`  | When you want to **apply generated migrations to the database**             | Executes SQL migrations that were previously generated to bring your DB up to date                     |
| `drizzle-kit pull`     | When you want to **reverse engineer the DB schema into Drizzle format**     | Introspects an existing database and generates Drizzle `schema.ts`, `relations.ts`, and a SQL snapshot |
| `drizzle-kit push`     | When you want to **push schema directly to the DB (without migrations)**    | Pushes your current Drizzle schema directly to the database — **skips** the SQL migration process      |
| `drizzle-kit studio`   | When you want to **visually inspect and browse your database**              | Spins up a local instance of Drizzle Studio for interactive DB browsing via a browser UI               |
| `drizzle-kit check`    | When you want to **verify migration consistency and avoid race conditions** | Scans generated migrations to detect possible race conditions or inconsistencies                       |
| `drizzle-kit up`       | When you want to **upgrade snapshot files after changes**                   | Updates schema snapshots for previously generated migrations — useful after reordering or patching     |

---

## ✅ API Schema & Type Safety

All routes **must** use **Zod** for both request and response schemas. Combine
it with
[`fastify-type-provider-zod`](https://github.com/SerayaEirik/fastify-type-provider-zod)
for:

- Fully typed handlers
- Auto-generated OpenAPI docs

**Example Response Schema**

```ts
import { z } from 'zod';

export const SuccessResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.unknown().optional(),
});

// Generic version for type-safe data
export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  SuccessResponseSchema.extend({
    data: dataSchema,
  });
```

**Example Fastify Route**

```ts
fastify.withTypeProvider<ZodTypeProvider>().route({
  url: '/',
  method: 'GET',
  schema: {
    querystring: ProfilePaginationQuerySchema,
    response: {
      200: createSuccessResponseSchema(z.array(z.object({ id: z.string() }))),
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
    },
  },
  preHandler: authMiddleware,
  handler: listProfiles,
});
```

---

## 📑 API Documentation Endpoints

- **Auth Reference:**

  ```http
  GET backend_endpoint/api/v1/auth/reference
  ```

- **Full API Reference:**

  ```http
  GET backend_endpoint/api/v1/reference
  ```

- **Quick Getting Started:**

   ```http
   GET backend_endpoint/api/v1/docs/getting-started
   ```

---

## 🔑 HTTP Status Code Guide

| Code | Status                | When to Use                     | Response Body Should Include       |
| ---- | --------------------- | ------------------------------- | ---------------------------------- |
| 200  | OK                    | Successful GET requests         | Requested data                     |
| 201  | Created               | Successful resource creation    | Created resource + Location header |
| 202  | Accepted              | Async processing started        | Processing status                  |
| 204  | No Content            | Successful request with no body | Empty body                         |
| 400  | Bad Request           | Client-side validation errors   | Error details                      |
| 401  | Unauthorized          | Missing/invalid authentication  | WWW-Authenticate header            |
| 403  | Forbidden             | Insufficient permissions        | Optional explanation               |
| 404  | Not Found             | Resource doesn't exist          | Optional error details             |
| 500  | Internal Server Error | Server-side failure             | Optional error details             |

---

## ✅ Recommended Practices

- Use **Zod** for all request & response schemas.
- Use `--env-file .env.*` custom env for custom environments.
- Change the env keys before making the project opensource.
