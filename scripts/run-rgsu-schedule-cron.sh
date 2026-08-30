#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

set -a
source .env
set +a

cron_secret="${CRON_SECRET:-${NEXTAUTH_SECRET:-}}"
: "${cron_secret:?CRON_SECRET or NEXTAUTH_SECRET is required}"

curl --fail-with-body --silent --show-error --max-time 1800 \
  --header "Authorization: Bearer ${cron_secret}" \
  "http://127.0.0.1:3002/api/schedule" \
  | logger --tag akademiks-rgsu-schedule
