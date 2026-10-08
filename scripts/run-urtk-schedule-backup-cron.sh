#!/usr/bin/env bash
set -euo pipefail

exec > >(logger --tag akademiks-urtk-backup) 2>&1
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

# Cron не загружает NVM. На сервере системный Node.js может быть старее Node.js приложения.
node_bin="${URTK_NODE_BIN:-$(command -v node || true)}"
if [[ -z "$node_bin" ]] || ! "$node_bin" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    source "${HOME}/.nvm/nvm.sh" --no-use
    nvm use 22 >/dev/null
    node_bin="$(command -v node)"
  else
    echo "Для выгрузки расписания требуется Node.js 22 или новее."
    exit 1
  fi
fi

timeout --signal=TERM --kill-after=30s 1h \
  "$node_bin" --env-file=.env --import tsx scripts/backup-urtk-schedule.ts
