#!/usr/bin/env bash
set -euo pipefail

exec > >(logger --tag akademiks-rgsu-groups) 2>&1
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

state_dir="${XDG_STATE_HOME:-${HOME}/.local/state}/akademiks-rgsu"
state_file="${state_dir}/groups-last-success"
now="$(date +%s)"

if [[ -f "$state_file" ]]; then
  last_success="$(<"$state_file")"
  if [[ "$last_success" =~ ^[0-9]+$ ]] &&
    ((now >= last_success && now - last_success < 2 * 24 * 60 * 60)); then
    echo "Пропуск: после успешного обновления прошло меньше 48 часов."
    exit 0
  fi
fi

# Cron не загружает NVM. На сервере системный Node.js старее Node.js приложения.
node_bin="${RGSU_NODE_BIN:-$(command -v node || true)}"
if [[ -z "$node_bin" ]] || ! "$node_bin" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    source "${HOME}/.nvm/nvm.sh" --no-use
    nvm use 22 >/dev/null
    node_bin="$(command -v node)"
  else
    echo "Для обновления групп требуется Node.js 22 или новее."
    exit 1
  fi
fi

mkdir -p "$state_dir"
echo "Начинаем обновление GUID и поиск групп по расписаниям преподавателей."
# Прямой запуск сохраняет общий flock до завершения работы, без HTTP-таймаута.
if timeout --signal=TERM --kill-after=30s 6h \
  "$node_bin" --env-file=.env --import tsx scripts/update-rgsu-groups.ts \
  --output "${state_dir}/groups-last-report.json"; then
  date +%s > "${state_file}.tmp"
  mv "${state_file}.tmp" "$state_file"
  echo "Обновление групп завершено. Отметка успешного запуска сохранена."
else
  exit_code=$?
  echo "Обновление групп не завершено, код: ${exit_code}. Отметка успеха не изменена."
  exit "$exit_code"
fi
