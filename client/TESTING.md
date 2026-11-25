# Frontend Tests

Use Node.js 22.13+ (22.x) or Node.js 24.x, matching the installed test tools.
Run from `client` after `npm ci`:

```sh
npm test
npm run test:watch
npm run test:coverage
```

Vitest automatically discovers `src/**/*.test.{js,jsx}` and
`src/**/*.spec.{js,jsx}`. Existing logic tests and React component tests use the
same runner; no backend, database, SMTP service, or real payment is required.

The separate `vitest.config.js` uses jsdom and React Testing Library. It does not
change the Vite development or production configuration. jsdom tests interaction
and DOM behavior, not CSS layout, real-device rendering, or browser compatibility.

Coverage includes all JavaScript/JSX under `src`, including untested files and
the application entry point. Only tests and test setup are excluded. Reports:

- `coverage/index.html`: browsable file-by-file coverage.
- `coverage/coverage-summary.json`: machine-readable totals.
- `coverage/lcov.info`: CI/editor integration.

Generated reports are ignored by Git. Coverage is diagnostic, not a claim that
all screens work; no new coverage gate blocks a demo build. Browser testing is
still needed for mobile layouts, Safari/Firefox, and real navigation flows.

Component tests use in-memory routers, isolated jsdom storage, mocked account/cart
context values, and the actual localization provider. They never modify the
browser storage used by your running demonstration or call production services.

Current priorities covered: login validation and role redirects, registration
field switching, authentication errors, mobile menu/language interactions,
checkout validation/focus, delivery drafts, decline/success, duplicate submission,
and order-storage failure recovery.

Verified baseline: 48 tests across 12 files; whole-source line coverage 30.15%.
This intentionally includes untested screens rather than reporting coverage only
for imported helper modules. Protected-route loading, guest redirects, role and
account-type mismatches, and successful access are also tested.
