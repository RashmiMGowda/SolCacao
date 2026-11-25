# Frontend Demo Deployment

This deployment hosts only the React/Vite frontend. It does not deploy Express,
MySQL, SMTP, or real payment processing. Use dummy account details only: local
demo authentication and submitted data live in each browser and are not secure
production identity or shared persistence.

## AWS Amplify

1. Review and commit the intended files on the feature branch, then use the
   team's pull-request workflow to merge into the selected deployment branch.
2. Connect that branch to AWS Amplify Hosting. Set the monorepo app root to
   `client`, and confirm `AMPLIFY_MONOREPO_APP_ROOT=client`.
3. Use the root `amplify.yml`. It selects Node 24, installs the locked packages,
   runs lint and discovered tests, builds the client, and publishes `client/dist`.
   It does not publish the repository, backend source, tests, or private env files.
4. Keep `VITE_AUTH_MODE=local`. Do not add a localhost API URL to the hosted demo.
   The build specification selects local mode explicitly. API integration later
   requires intentionally updating that setting and supplying an HTTPS API URL.
5. In Amplify **Rewrites and redirects**, add this SPA rule. This is a separate
   hosting setting, not something the build specification configures:

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

6. Deploy and test the resulting HTTPS URL in a fresh browser profile.

AWS references:
- https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html
- https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html

## Before Sharing the URL

- Open and refresh `/about`, `/login`, `/shop`, `/contact`, and `/sampler` directly.
- Sign in with each demo role and check the correct account destination.
- Register a business, sign out, approve it as admin, then sign back in as that
  business in the same browser and submit a request. Different devices do not
  share approvals, accounts, carts, or quotes in local demo mode.
- Test cart restoration, sampler creation, simulated checkout, confirmation
  reload, EN/ES, and mobile navigation.
- Confirm images load over HTTPS. Some images come from third-party sites;
  their availability and permission to reuse are separate deployment concerns.
- Verify browser developer tools show no requests to localhost/127.0.0.1 APIs.
- WhatsApp uses recipient-selected sharing, not a direct SolCacao phone number.
- Monitor AWS credits/usage. Do not enable paid services or connect a real
  payment gateway simply to demonstrate the frontend.

## Security and Release Notes

- Every `VITE_` value can be embedded in public frontend JavaScript. Never add
  SMTP credentials, database passwords, JWT signing secrets, or AWS keys there.
- Only source, tests, lockfiles, and intentional configuration belong in Git.
  Generated `dist`, coverage and dependencies should not be committed. Existing
  tracked backend dependencies are not part of the Amplify frontend artifact.
- The bundle-size warning is not a build failure. Code splitting is a later
  optimization and is not required to preserve this demo.
- Passing tests and a local production preview are not proof of deployed
  rewrites, GitHub permissions, or successful AWS provisioning. Recheck the
  actual hosted URL after deployment.
