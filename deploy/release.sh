#!/usr/bin/env bash
set -euo pipefail
umask 077

root=/opt/solcacao
revision=${1:?Commit SHA required}
archive=${2:?Release archive required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
release=$(mktemp -d "$root/releases/$revision.XXXXXX")
trap 'rm -f -- "$archive"' EXIT
exec 9>"$root/deploy.lock"
flock -w 120 9

tar -xzf "$archive" -C "$release"
ln -s "$root/shared/server.env" "$release/server/.env"
cd "$release/server"
npm ci --omit=dev
node --env-file="$root/shared/migrations.env" src/scripts/setupDatabase.js
node src/scripts/checkDatabase.js

previous=$(readlink "$root/current" || true)
activate() {
  ln -sfn "$1" "$root/.current-next"
  mv -Tf "$root/.current-next" "$root/current"
}
ready() {
  local body
  body=$(curl --fail --silent --max-time 3 http://127.0.0.1:5000/api/ready) || return 1
  printf '%s' "$body" | node -e 'const r = JSON.parse(require("node:fs").readFileSync(0, "utf8")); if (r.status !== "ready" || r.database !== "mysql") process.exit(1)'
}

activate "$release"
if sudo -n systemctl restart solcacao-api.service; then
  for attempt in {1..20}; do
    if ready; then
      echo "Deployed $revision with MySQL ready."
      exit 0
    fi
    sleep 2
  done
fi

echo "Release failed readiness. Restoring the previous application if available." >&2
if [[ -n "$previous" ]]; then
  activate "$previous"
  sudo -n systemctl restart solcacao-api.service
else
  sudo -n systemctl stop solcacao-api.service
  unlink "$root/current"
fi
exit 1
