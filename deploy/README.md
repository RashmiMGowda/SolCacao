# Host Express and MySQL on Lightsail

Amplify builds `client/` from `main`. The backend workflow tests and releases the same branch when server, database, or deployment files change. Complete the server setup and add the GitHub secrets before merging this workflow into `main`.

## Prepare the instance

1. Create an Ubuntu Lightsail instance, attach a static IP, and point your API hostname at it. Install Docker Engine with Compose, Node.js 24 at `/usr/bin/node`, npm, Nginx, curl, and Certbot. Verify `node --version` and `docker compose version`.
2. Open HTTPS and HTTP in the Lightsail firewall. Keep ports 3306 and 5000 closed to the internet. Allow SSH from your administration IP and the deployment runner. Standard GitHub-hosted runners use changing outbound IPs. For restricted SSH ingress, use a runner with a fixed outbound IP and adjust the workflow runner label.
3. Create the unprivileged deployment account and directories:

   ```bash
   sudo adduser --disabled-password --gecos "" solcacao
   sudo install -d -m 0700 -o solcacao -g solcacao /opt/solcacao \
     /opt/solcacao/incoming /opt/solcacao/releases /opt/solcacao/shared /opt/solcacao/shared/b2b
   ```

4. Install a dedicated SSH public key in `/home/solcacao/.ssh/authorized_keys` (directory mode 700, file mode 600, owned by `solcacao`). Use key authentication. Keep the matching private key in the GitHub production environment. The deployment account does not need Docker group membership.

## Start MySQL once

Create `/etc/solcacao` as root with mode 700. Copy `deploy/compose.yml` there and create `mysql.env` with mode 600. Generate separate random passwords for the root, migration, and application accounts. Hex strings from `openssl rand -hex 32` are easy to put into env files.

```dotenv
MYSQL_DATABASE=solcacao
MYSQL_ROOT_PASSWORD=replace_with_private_root_password
MYSQL_MIGRATOR_PASSWORD=replace_with_private_migration_password
```

```bash
sudo docker compose -p solcacao-production \
  --env-file /etc/solcacao/mysql.env -f /etc/solcacao/compose.yml up -d --wait
sudo docker compose -p solcacao-production \
  --env-file /etc/solcacao/mysql.env -f /etc/solcacao/compose.yml exec mysql mysql -uroot -p
```

In the MySQL prompt, create a runtime user with data permissions. Replace the password placeholder with the third private password.

```sql
CREATE USER 'solcacao_app'@'%' IDENTIFIED BY 'replace_with_private_application_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON solcacao.* TO 'solcacao_app'@'%';
```

The migration account is created by the MySQL container on first initialization and has schema permissions for `solcacao`. The named volume persists across releases and container restarts. Changing initialization passwords in `mysql.env` after creation requires a matching MySQL password change. Back up the database and the shared B2B attachments before schema changes.

## Configure Express and the reverse proxy

Create `/opt/solcacao/shared/server.env` owned by `solcacao` with mode 600. Use your exact Amplify origin with no trailing slash.

```dotenv
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend.amplifyapp.com
JWT_SECRET=replace_with_private_random_secret_at_least_32_characters
USE_MOCK_AUTH_REPOSITORY=false
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=solcacao
DB_USER=solcacao_app
DB_PASSWORD=replace_with_private_application_password
```

Add your existing SMTP settings here if you want real password-reset emails. In `/opt/solcacao/shared/migrations.env` (same ownership and mode), set only:

```dotenv
DB_USER=solcacao_migrator
DB_PASSWORD=replace_with_private_migration_password
```

Copy `deploy/solcacao-api.service` to `/etc/systemd/system/` as root, then run `sudo systemctl daemon-reload` and `sudo systemctl enable solcacao-api.service`. The first release starts the service. Use `sudo visudo -f /etc/sudoers.d/solcacao-deploy` to grant only these service operations:

```text
solcacao ALL=(root) NOPASSWD: /usr/bin/systemctl restart solcacao-api.service, /usr/bin/systemctl stop solcacao-api.service
```

Configure an Nginx site for your API hostname, enable it, validate with `sudo nginx -t`, and reload Nginx. Obtain a certificate with `sudo certbot --nginx -d api.example.com` after DNS resolves. Configure the resulting HTTPS site to preserve the same proxy settings.

```nginx
server {
    listen 80;
    server_name api.example.com;
    client_max_body_size 12m;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Enable releases

Create a GitHub Actions environment named `production` and restrict deployments to `main`. Add these environment secrets:

| Secret | Value |
| --- | --- |
| `LIGHTSAIL_HOST` | Static IP or DNS hostname used for SSH |
| `LIGHTSAIL_SSH_KEY` | Dedicated deploy private key |
| `LIGHTSAIL_KNOWN_HOSTS` | OpenSSH known_hosts entry for that exact host, verified against the instance host key via the Lightsail console |

Merge into `main` or run **Backend deployment → Run workflow** on `main`. The workflow runs the backend and isolated MySQL tests, uploads the tested commit, applies pending migrations with the migration account, verifies the schema using the runtime account, and restarts Express. It checks readiness locally and restores the previous application release on a failed restart or readiness check. Schema migrations stay applied, so make migrations compatible with both the old and new application. Keep the prior release directory for rollback and periodically remove obsolete releases after reviewing what is active.

Check `https://api.example.com/api/ready` from outside Lightsail. Then set `VITE_AUTH_MODE=api` and `VITE_API_BASE_URL=https://api.example.com/api` for `main` in Amplify and rebuild the frontend. Without those variables the client defaults to demo mode. Test registration and approval from the live site.

The workflow runs schema migrations without development seeds. To create the first admin, register a dedicated account with a private password and have the database administrator promote that exact account to `ADMIN` in `users`. Sign in again after promotion. If the demo needs catalog data, review the fixture data and run `npm --prefix server run db:seed:catalog` once from the deployed checkout. Keep demo account and workflow seeds out of the hosted database.

## Test modules independently

Teammates can use the deployed Amplify URL without installing Node or MySQL once
its API-mode build is live. Use dedicated test accounts and sample data. To test
an unmerged client change against the hosted API, set VITE_API_BASE_URL in a
local terminal and run npm --prefix client run dev:api. Use the HTTPS API base
ending in /api. Changes made this way affect the hosted database. For isolated
database writes or unmerged server changes, use the local MySQL setup in db/README.md.

| Feature | Quick acceptance check |
| --- | --- |
| Accounts and approval | Register a business account, approve it from a separate admin session, then sign back in as the business user. |
| B2B quotes | Submit a sample request as an approved business, review and quote as admin, then respond as the business user. |
| Contact and feedback | Submit valid sample data and confirm an inquiry reference. Verify whitespace-only input is rejected. |
| Sampler | Build a valid box and confirm POST /api/samplers succeeds and returns the saved configuration. |
| Localization | Check GET /api/translations/es returns a nonzero count. Sign in, switch to Spanish and verify the preference survives signing out and back in. |
| Shopping | Browse, use the browser cart and exercise demo checkout. These screens do not require the shopping APIs. |

Run npm --prefix server run db:seed:catalog once from the active hosted release
as the application user to populate the bilingual dictionary. The existing
command also inserts public catalog fixtures and preserves existing rows.
Production deployment does not seed demo accounts or workflow records.

Pull requests to main or development run the backend and isolated MySQL tests
in GitHub Actions. The release job only runs for main pushes that match the
workflow paths or a manual run on main. Review the green test and deploy jobs,
then verify the public HTTPS readiness response and test the Amplify build in
an independent browser session.
