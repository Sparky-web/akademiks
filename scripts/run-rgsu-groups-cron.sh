#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

state_dir="${XDG_STATE_HOME:-${HOME}/.local/state}/akademiks-rgsu"
state_file="${state_dir}/groups-last-success"
now="$(date +%s)"

if [[ -f "$state_file" ]]; then
  last_success="$(<"$state_file")"
  if [[ "$last_success" =~ ^[0-9]+$ ]] &&
    ((now - last_success < 2 * 24 * 60 * 60)); then
    exit 0
  fi
fi

set -a
source .env
set +a

cron_secret="${CRON_SECRET:-${NEXTAUTH_SECRET:-}}"
: "${cron_secret:?CRON_SECRET or NEXTAUTH_SECRET is required}"

curl --fail-with-body --silent --show-error --max-time 1800 \
  --header "Authorization: Bearer ${cron_secret}" \
  "http://127.0.0.1:3002/api/groups/update-rgsu-ids" \
  | logger --tag akademiks-rgsu-groups

mkdir -p "$state_dir"
date +%s > "${state_file}.tmp"
mv "${state_file}.tmp" "$state_file"
