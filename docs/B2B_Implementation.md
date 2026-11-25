# B2B design and workflow

Implemented on `jagriti-b2b` using `Team17_Interactive_Prototype(MockFlow).html` as the main reference. The B2B-specific prototype remains available separately. The existing development structure and dependency versions are preserved.

## Match to MockFlow

The public services page uses the cream background, serif headline, two-column hero, original imagery with a local image fallback, four inset service cards, contact action, and business account requirement shown in the team prototype. It uses development's single shared site header and footer rather than rendering a second logo/header.

The wizard uses connected numbered steps above a light, bordered 900px card. It retains the four cacao, brand/files, packaging, and review steps, preselects Madagascar, 25 kg, luxury packaging, and company branding as the reference does, and prefills the authenticated company name. English/Spanish switching preserves form values. The language follows the services-to-wizard link, including a login redirect.

## Complete request lifecycle

1. Browse services publicly, then sign in with a business account.
2. New business accounts begin pending. A shop owner can approve or reject them in Business Account Review. Rejected accounts can edit their company information and return to pending review.
3. Approved accounts configure cacao, quantity, brand/design details, packaging, and branding. Up to five optional PDF, SVG, PNG, or JPEG attachments are supported, totaling no more than 5 MB.
4. Submit to the authenticated API. The server validates the account's current approval and the complete payload, validates attachment names/content signatures/size, saves private files, and persists the request and initial status history. A stable client-generated request identifier prevents duplicate records on retries.
5. View saved requests and details from My Requests. Authenticated owners can download their files; other businesses cannot access them.
6. Shop owners review requests and issue USD manufacturing quotes with an expiry and notes.
7. Businesses accept or decline their own unexpired quotes. Closed decisions cannot be repeated or changed. Expired quotes cannot be accepted; shop owners can issue a replacement. Quote numbers, amounts, expiry and state changes are recorded in history.

This is the B2B request and quotation workflow. Acceptance records a decision; it does not create a paid order. No payment flow or quote-email notifications are introduced.

## Local setup

Use Node.js compatible with the existing Vite dependencies. Run `npm ci` separately in `client` and `server`.

Copy `client/.env.example` to `client/.env.local` to select API authentication. Use `VITE_API_BASE_URL=http://127.0.0.1:5000/api` and open the frontend at `http://127.0.0.1:5173` so it matches the server's CORS origin. Start the server with `npm start` in `server` and the client with `npm run dev -- --host 127.0.0.1` in `client`.

Without MySQL, the existing mock authentication repository and new JSON request repository are used. On a fresh non-production mock user store, these demo accounts are seeded:

| Account | Email | Password |
| --- | --- | --- |
| Approved business | business@solcacao.test | Password123! |
| Pending business | pending@solcacao.test | Password123! |
| Retail customer | customer@solcacao.test | Password123! |
| Shop owner | admin@solcacao.test | Password123! |

The default authentication seed only initializes an empty store; it does not overwrite existing users or add administrators to a populated store. The new owner/pending demo seeds are disabled in production. Existing MySQL demo seeding remains available through the established `db:seed` script.

For this chat's checkout, API mode is already configured in ignored local environment files. Local authentication uses `server/data/b2b/demo-users.json`, keeping generated credentials out of the tracked source file. The test request named **MockFlow Browser Test** was left saved so you can inspect its accepted quote and attachment.

Test URLs:

- `/business`: services
- `/business/quote`: approved business wizard
- `/business/requests`: current business requests
- `/business/manage`: owner request management
- `/business/accounts`: owner business account review

Sign in as the shop owner by entering the owner demo email/password on the regular login page. Sign in as the approved business to submit and respond to quotes. An owner cannot submit or accept quotes on a business's behalf.

## Storage and MySQL

The repository follows authentication's configured mode: JSON when `USE_MOCK_AUTH_REPOSITORY=true` or MySQL is absent, otherwise MySQL. SQL uses the existing `b2b_custom_requests`, `b2b_request_files`, `b2b_request_status_history`, and `b2b_quotes` tables. No schema or dependency changes are required.

Request/quote/history writes use MySQL transactions and row locks for state transitions. JSON writes use a process-local queue and atomic file replacement; the JSON mode is intended for one local server process. For a multi-instance service, use MySQL and shared durable attachment storage.

Attachments are stored below `server/data/b2b` by default, with generated paths rather than user filenames, and are never mounted as public static files. `B2B_DATA_DIR` overrides this directory. Configure durable storage and backups for deployment; SQL metadata does not contain the file contents. `AUTH_DATA_PATH` can select a separate mock user store.

## Validation and limits

The automated `npm test` workflow uses isolated temporary files and HTTP requests. It covers missing/retail/pending authorization, new account registration and review, approval revocation, complete payload validation, invalid names/types/content, multiple attachments, retry deduplication, request ownership, private download content, status history, owner review/quotes, accept/decline, expired quote rejection and replacement, and data surviving server restart.

Client build and lint pass. Browser checks covered the business login return path, quantity validation, real attachment selection and submission, saved request detail, owner review and quote issuance, customer acceptance and persistence after reload, pending access denial, Spanish navigation, and mobile layout without horizontal overflow. Existing home, about, contact, shop, sampler and password pages still render.

MySQL is not configured in this environment. Its repository path is implemented against the existing schema, but has not been exercised against a live database. SMTP, deployment storage, and production infrastructure are not validated here. The browser's download observer did not report a download event; the automated HTTP test verified authorized file bytes and download headers, and the browser showed the attachment control without console errors.

## Changed source files

| Files | Purpose |
| --- | --- |
| `client/src/features/b2b/b2b.css` | Scoped MockFlow styling and responsive layouts. |
| `client/src/features/b2b/components/B2BHeader.jsx` | Company/language/request toolbar without duplicate site header. |
| `client/src/features/b2b/components/B2BWizard.jsx` | Reference-style wizard, validation, multiple files, real submission and receipt. |
| `client/src/features/b2b/components/BusinessGate.jsx` | API sign-in, account type, approval and owner access gates. |
| `client/src/features/b2b/pages/B2BPage.jsx` | Public MockFlow services page and contact/quote links. |
| `client/src/features/b2b/pages/B2BWizardPage.jsx` | Wizard shell and language propagation. |
| `client/src/features/b2b/pages/B2BRequestsPage.jsx` | Business/owner list and detail pages, file downloads, review, quote issuance and responses. |
| `client/src/features/b2b/pages/B2BAccountsPage.jsx` | Owner approval/rejection with reasons. |
| `client/src/features/b2b/services/requestService.js` | Authenticated request, file, quote and account-review API calls. |
| `client/src/App.jsx` | Protected request, management and account-review routes. |
| `client/src/layouts/Header.jsx` | Route owner accounts to their dashboard. |
| `client/src/features/auth/pages/LoginPage.jsx` | Restore intended B2B destination/language; route owners to management. |
| `client/src/features/auth/pages/BusinessProfilePage.jsx` | Request links; redirect owners away from business profiles. |
| `client/.env.example` | Document API authentication setup. |
| `server/src/modules/b2b/requestValidators.js` | Server payload, filename, content-signature and aggregate file limits. |
| `server/src/modules/b2b/requestRepository.js` | JSON/MySQL persistence, private storage, retries, quote transitions and history. |
| `server/src/modules/b2b/requestRoutes.js` | Authenticated B2B and owner endpoints with current-user permission checks. |
| `server/src/app.js` | Mount B2B routes with bounded route-specific JSON parsing. |
| `server/src/modules/users/mockUserRepository.js` | Mock business review, test/local store override, non-production empty-store owner/pending seeds. |
| `server/src/modules/users/mysqlUserRepository.js` | MySQL business account listing and review updates. |
| `server/src/modules/users/userMapper.js` | Exclude password reset records from public users. |
| `server/test/b2b.test.js`, `server/package.json` | Isolated automated workflow test and test command. |
| `.gitignore` | Exclude generated B2B requests, attachment files and local demo user store. |
| `docs/B2B_Implementation.md` | This setup, behavior and validation guide. |

All package dependency versions, lockfiles, database schema, and existing prototype documents remain unchanged. GitHub branches are unchanged; this work is local.
