# SolCacao

SolCacao is a full-stack chocolate e-commerce project created by Team 17 for
CSE 5335 at the University of Texas at Arlington. The application provides a
retail shopping experience alongside business-account and custom-order
workflows.

## Features

- Browse and search the chocolate catalog, view product details, and manage a
  shopping cart.
- Complete a simulated checkout and view order confirmations and order history.
- Register and sign in with role-based customer, business, and admin accounts.
- Manage B2B account approval and custom-order requests, including quote and
  customer response workflows.
- Configure custom chocolate samplers.
- Submit contact and feedback inquiries.
- Use the interface and translation data in English and Spanish.
- Run a browser-based demo or connect supported modules to the API and MySQL.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, React Router, Vite, Tailwind CSS |
| Backend | Node.js 24, Express 5, JWT authentication |
| Database | MySQL 8.4, versioned schema migrations |
| Tests | Vitest and Testing Library (client); Node.js test runner (server) |
| Deployment | AWS Amplify Hosting (client); AWS Lightsail via GitHub Actions (server) |

## AWS deployment

Deployment configuration is included for an AWS Amplify frontend and an AWS
Lightsail-hosted Express API. The backend workflow runs tests and deploys on
eligible pushes to `main`; deployment requires provisioned AWS resources and
private GitHub environment secrets. See [the deployment guide](deploy/README.md).
The frontend can also run in local demo mode without a deployed API.

## Project structure

```text
.
├── client/                 React/Vite frontend
├── server/                 Express API
├── db/                     MySQL schema, migrations, and seed data
├── deploy/                 Backend deployment configuration and guide
├── docs/                   Project and design documentation
├── .github/workflows/      CI and backend deployment workflow
├── amplify.yml             AWS Amplify frontend build configuration
├── compose.yml             Local MySQL service
└── README.md
```

## Getting started

Requires Node.js 24 and npm.

### Frontend demo

```bash
npm --prefix client ci
npm --prefix client run dev
```

This starts the browser-based frontend demo and does not require MySQL.

### Backend API

In a separate terminal:

```bash
npm --prefix server ci
cp server/.env.example server/.env
npm --prefix server run dev
```

The API defaults to port 5000. For local API integration, set
`VITE_AUTH_MODE=api` and `VITE_API_BASE_URL=http://127.0.0.1:5000/api` in
`client/.env`, then run `npm --prefix client run dev`. Database-backed features
require MySQL configuration and setup; follow the [server guide](server/README.md)
and [database guide](db/README.md). Environment example files contain variable
names only. Keep real credentials in private, ignored `.env` files.

## Team 17

- Teammates: [Name], [Name], [Name], [Name]
- Rashmi Gowda — contributions: [Add your contributions]
