# Shared Phase 3 database and module handoff

MySQL 8.4 is the supported local database. Run commands from the repository root unless stated otherwise. The executable database source is **db/**; documents and archived SQL files are not imported by setup.

## First-time setup (Windows PowerShell)

1. Install Node.js 24 and Docker Desktop, and start Docker Desktop.
2. Copy `.env.docker.example` to `.env.docker`, set a private
   `MYSQL_ROOT_PASSWORD`, then run
   `docker compose --env-file .env.docker up -d mysql`.
3. Run `npm --prefix server ci`.
4. Copy `server/.env.example` to `server/.env` only if your private file does not already exist.
5. Configure `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_USER=root`,
   `DB_NAME=solcacao`, `DB_PASSWORD` to match your Docker MySQL password, and
   `USE_MOCK_AUTH_REPOSITORY=false`. Set `CLIENT_ORIGIN=http://127.0.0.1:5173`.
   Generate a private JWT secret with
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   and put it in `JWT_SECRET`.
6. Run `npm --prefix server run db:prepare`.
7. Run `npm --prefix server run test:mysql` to verify migrations, seed preservation, registration, permissions, profile updates, approval and password recovery in an isolated test database. This test requires CREATE/DROP DATABASE privileges and never drops the application database.

The same setup is safe to repeat after pulling teammates' changes. Never delete the Docker volume to apply migrations. `RESET_DATABASE` does not drop data. Do not commit private environment files.

## Start the authentication/admin API integration

In one terminal: `npm --prefix server run dev`.

In another: `npm --prefix client ci`, then `npm --prefix client run dev:api`.

Open http://127.0.0.1:5173. Stop an existing frontend process on that port before switching modes. `npm --prefix client run dev` retains the frontend-only demo; Amplify's local demo configuration remains unchanged. `dev:api` overrides only the process environment and does not edit private .env files. API mode connects authentication, B2B, contact, sampler, and localization. Catalog, cart and checkout continue to use the browser demo flow. See [independent module testing](../deploy/README.md#test-modules-independently).

`GET /api/ready` confirms a real MySQL connection; `GET /api/health` reports service/configuration status. For a hosted frontend, explicitly configure the API HTTPS URL and allowed frontend origin. Do not place MySQL or SMTP credentials in VITE variables.

## Tables available to the team

| Module | Tables | Handoff |
| --- | --- | --- |
| Harsha: accounts/admin | users, addresses, corporate_partners, password_reset_tokens | Authentication/profile/approval REST endpoints and React fetch adapters implemented |
| Catalog | categories, products, product_translations, product_images, inventory | Build product/search/inventory APIs and integrate catalog |
| Cart/sampler | carts, cart_items, custom_samplers, custom_sampler_items | `GET /api/samplers` loads saved configurations on module entry; `POST /api/samplers` persists validated configurations per browser session and calculates prices on the server; cart/order APIs remain separate |
| Checkout/orders | orders, order_items, order_addresses, payments, order_status_history, shipments | Build transaction-based order APIs; check stock and use server prices; never store card numbers or CVV |
| Business requests | b2b_custom_requests, b2b_request_files, b2b_request_status_history, b2b_quotes | Existing API/repository; continue module-specific work and integration |
| Contact/feedback | inquiries | Build validated submission/query APIs |
| Localization | translation_keys, translation_values | Product and UI dictionary snapshots seeded for both locales; implement retrieval APIs and integration |

There are **26 application tables**, plus **schema_migrations**. Baseline schema: `schema/solcacao_schema.sql`. Later changes, including `users.auth_version` and numeric CHECK constraints, are in numbered `migrations/`. Run migrations rather than importing the baseline alone. Archived `archive/mysql_schema_v2.sql` and the old SQL seed are historical references.

Foreign keys and CHECK constraints enforce relationships and valid numeric values. Application APIs still own authorization, legal status transitions, active-product checks, stock reservations and pricing calculations. Product IDs currently match frontend slugs to ease integration; IDs are opaque strings, so do not assume every seeded ID is a UUID. B2B request fixture IDs are valid UUIDs. Money is integer cents; timestamps are MySQL DATETIME values.

## Seed data and repeatability

`db:prepare` applies migrations, then auth, catalog and workflow seeds, and checks every baseline table/column plus session-version support. It preserves existing user profiles, changed passwords, approvals and stock levels.

- Seven demo accounts: customer, approved business, pending business, boutique, cafe, rejected business and admin. Emails are in `seed/auth_demo_users.json`; initial password for newly inserted demo accounts is `Password123!`. Existing accounts are not reset by seeding.
- Eight catalog products, EN/ES product text, images and inventory from the current frontend catalog snapshot in `seed/catalog.json`.
- A sample cart and sampler, order/items/address, simulated payment, order history, shipment, business request/quote/history and contact/feedback inquiries.
- No fake reset tokens or file attachments are seeded. Those tables are populated by real reset requests and uploads.
- `seed/localization.json` contains the current EN/ES dictionary snapshot. Nested keys use the top-level namespace and dot-separated key name. Free-text UI message keys use namespace `ui` and SHA-256 of the original English text; the English value retains the source message. Future dictionary changes need an explicit seed update/migration; repeat seeds preserve existing translations.

Use `db:seed`, `db:seed:catalog` or `db:seed:workflows` individually when needed. Seeds are for development only; do not expose demo credentials in a production account database.

## Migrations and team changes

Add a new numbered CommonJS file exporting `async up(connection)` under `db/migrations/`. Do not edit an applied migration or the baseline: checksums deliberately detect divergent history. MySQL DDL auto-commits, so write retry-safe migrations and back up data before production upgrades. A named database lock serializes migration runs. Existing databases get missing tables and known auth columns; incompatible manually edited column definitions need an explicit migration, not a reset.

Harsha's API contracts: POST `/api/auth/register`, `/login`, `/forgot-password`, `/reset-password`; GET/PUT `/api/auth/me`; GET `/api/auth/admin/business-accounts`; PATCH `/api/auth/admin/business-accounts/:userId/approval` with `approvalStatus` and optional `rejectionReason`. Protected calls require `Authorization: Bearer <JWT>`. Errors use `{ error: { message, details } }` and meaningful HTTP statuses.

Production startup requires a private secret of at least 32 characters and explicit MySQL configuration. Password resets consume a token atomically, invalidate all outstanding reset tokens and revoke older JWTs. SMTP delivery needs valid private SMTP credentials; automated tests stub email delivery. Auth attempt limiting is per process/IP; configure a trusted proxy and shared limiter deliberately if deploying multiple replicas.
