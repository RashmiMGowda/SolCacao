# SolCacao server

Express 5 API for authentication, accounts, catalog, carts, orders, samplers,
business-to-business requests, contact submissions, and localization. It uses
MySQL when configured and can use local JSON-backed data for development.

## Install and configure

Requires Node.js 24 and npm.

```bash
npm ci
cp .env.example .env
```

`.env.example` contains variable names only. Configure the private `.env` file:

| Variable | Purpose |
| --- | --- |
| `PORT`, `HOST` | API listen port and host; defaults are 5000 and `0.0.0.0`. |
| `CLIENT_ORIGIN` | Allowed frontend origin for CORS. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Private signing secret and token lifetime. Set a random secret for persistent local or production use; production requires at least 32 characters. |
| `USE_MOCK_AUTH_REPOSITORY` | Set to `true` to use JSON auth storage; otherwise configure MySQL. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection settings. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `INQUIRY_RECIPIENT` | Optional SMTP and inquiry-notification settings. |
| `BCRYPT_ROUNDS`, `NODE_ENV`, `TRUST_LOOPBACK_PROXY` | Password hashing, runtime mode, and optional loopback proxy setting. |

Keep `.env` private and do not put server secrets in `VITE_` variables. With no
MySQL settings, the API can run against its local JSON fallback for development.

## Database setup

MySQL 8.4 is the supported database. From the repository root, copy
`.env.docker.example` to `.env.docker`, set a private `MYSQL_ROOT_PASSWORD`, and
start the database:

```bash
docker compose --env-file .env.docker up -d mysql
npm --prefix server run db:prepare
```

Set the server's `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_USER=root`,
`DB_PASSWORD` to the same private password, `DB_NAME=solcacao`, and
`USE_MOCK_AUTH_REPOSITORY=false`. `db:prepare` applies the schema migrations,
loads development seed data, and checks the database. It is repeatable and does
not drop the application database. See [the database guide](../db/README.md)
for manual MySQL setup, migrations, seeds, and integration tests.

## Run and test

```bash
npm run dev
```

The API listens on port 5000 by default. Run the server tests with:

```bash
npm test
```

## Main API endpoints

All API paths are prefixed with `/api`.

| Area | Main endpoints |
| --- | --- |
| Health | `GET /health`, `GET /ready` |
| Authentication | `POST /auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`; `GET` and `PUT /auth/me`; admin business-account listing and approval under `/auth/admin/business-accounts`. |
| Catalog and cart | `GET /products`; `GET /cart`; `POST /cart/persist`, `/cart/merge`. |
| Samplers and orders | `GET` and `POST /samplers`; `POST /orders`; authenticated `GET /orders`; `GET /orders/:orderId`. |
| B2B | `/b2b/requests`, `/b2b/accounts`, request review, quote, response, and attachment routes. |
| Contact and localization | `POST /inquiries`; `GET /translations`, `/translations/:locale`; authenticated translation preference `GET` and `PUT`. |

Protected endpoints require `Authorization: Bearer <token>`. Consult the route
modules in `src/modules/` for request bodies and authorization requirements.

## AWS deployment

The repository includes a GitHub Actions workflow for testing and deploying the
backend to AWS Lightsail, and an Amplify build configuration for the client.
Deployment requires AWS resources and private GitHub environment secrets; see
the [deployment guide](../deploy/README.md).
