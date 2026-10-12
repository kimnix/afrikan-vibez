#!/usr/bin/env bash
# Local, user-owned PostgreSQL helper for development.
# Creates and runs a PostgreSQL cluster inside ./.pgdata on port 5433 so the
# project is fully runnable without Docker or root access.
#
# Usage: scripts/db.sh {init|start|stop|status|psql|reset}
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="${ROOT_DIR}/.pgdata"
PGPORT="${PGPORT:-5433}"
DB_NAME="${DB_NAME:-african_vibes}"
PG_BIN="/usr/lib/postgresql/18/bin"

if [ ! -d "${PG_BIN}" ]; then
  PG_BIN="$(dirname "$(command -v initdb || command -v pg_ctl)")"
fi
export PATH="${PG_BIN}:${PATH}"

log() { printf '\033[33m[db]\033[0m %s\n' "$1"; }

init_cluster() {
  if [ -f "${PGDATA}/PG_VERSION" ]; then
    log "cluster already initialised at ${PGDATA}"
  else
    log "initialising cluster at ${PGDATA}"
    mkdir -p "${PGDATA}"
    initdb -D "${PGDATA}" -U postgres --auth=trust >/dev/null
  fi
  start_cluster
}

start_cluster() {
  if pg_ctl -D "${PGDATA}" status >/dev/null 2>&1; then
    log "already running on port ${PGPORT}"
  else
    log "starting on port ${PGPORT}"
    pg_ctl -D "${PGDATA}" \
      -o "-p ${PGPORT} -k /tmp -c listen_addresses=127.0.0.1" \
      -l "${PGDATA}/server.log" start >/dev/null
    sleep 1
  fi
  if ! psql -h 127.0.0.1 -p "${PGPORT}" -U postgres -lqt | cut -d '|' -f1 | grep -qw "${DB_NAME}"; then
    log "creating database ${DB_NAME}"
    createdb -h 127.0.0.1 -p "${PGPORT}" -U postgres "${DB_NAME}"
  else
    log "database ${DB_NAME} present"
  fi
}

stop_cluster() {
  pg_ctl -D "${PGDATA}" stop -m fast >/dev/null 2>&1 || true
  log "stopped"
}

case "${1:-start}" in
  init) init_cluster ;;
  start) start_cluster ;;
  stop) stop_cluster ;;
  status) pg_ctl -D "${PGDATA}" status || true ;;
  psql) psql "postgresql://postgres@127.0.0.1:${PGPORT}/${DB_NAME}" ;;
  reset)
    stop_cluster
    rm -rf "${PGDATA}"
    init_cluster
    ;;
  *)
    echo "Usage: $0 {init|start|stop|status|psql|reset}" >&2
    exit 1
    ;;
esac
