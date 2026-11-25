# SolCacao client

React single-page frontend built with Vite. In local demo mode, authentication,
cart, sampler, and checkout demo data are kept in the browser; this mode does
not require the API or MySQL.

## Install

Requires Node.js 24 and npm.

```bash
npm ci
```

## Environment

Copy `.env.example` to `.env`. The example contains variable names only.

| Variable | Purpose |
| --- | --- |
| `VITE_AUTH_MODE` | Use `local` for the browser demo or `api` for backend auth and connected modules. |
| `VITE_API_BASE_URL` | Backend API base URL, ending in `/api`; used in API mode. |

For local demo mode, set `VITE_AUTH_MODE=local`. To use the local API, start the
server and set `VITE_AUTH_MODE=api` and
`VITE_API_BASE_URL=http://127.0.0.1:5000/api`. Vite variables are public in the
built client bundle; never put passwords, tokens, or other secrets in them.

## Run

```bash
npm run dev
```

Open the local URL printed by Vite. To launch the frontend with its API-mode
environment without editing `.env`, use `npm run dev:api` (defaults to the local
server URL above; `VITE_API_BASE_URL` can override it).

## Test and build

```bash
npm test
npm run lint
npm run build
```

The production build is written to `dist/`. AWS Amplify's monorepo build
configuration uses this directory for the hosted frontend artifact.
