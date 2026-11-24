#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
DATA_DIR="$ROOT_DIR/.local/mysql"
RUN_DIR="$ROOT_DIR/.local/mysql-run"
MYSQL_BASE="${MYSQL_BASE:-/usr/local/mysql}"
PORT="${MYSQL_PORT:-3307}"

if [ ! -d "$DATA_DIR/mysql" ]; then
  mkdir -p "$DATA_DIR" "$RUN_DIR"
  "$MYSQL_BASE/bin/mysqld" \
    --initialize-insecure \
    --basedir="$MYSQL_BASE" \
    --datadir="$DATA_DIR"
fi

if [ -f "$RUN_DIR/mysqld.pid" ] && kill -0 "$(cat "$RUN_DIR/mysqld.pid")" 2>/dev/null; then
  echo "MySQL already running on port $PORT"
  exit 0
fi

mkdir -p "$RUN_DIR"
"$MYSQL_BASE/bin/mysqld" \
  --basedir="$MYSQL_BASE" \
  --datadir="$DATA_DIR" \
  --port="$PORT" \
  --bind-address=127.0.0.1 \
  --socket="$RUN_DIR/mysql.sock" \
  --pid-file="$RUN_DIR/mysqld.pid" \
  --log-error="$RUN_DIR/mysqld.log" \
  --daemonize

for _ in $(seq 1 30); do
  if "$MYSQL_BASE/bin/mysqladmin" --protocol=tcp -h 127.0.0.1 -P "$PORT" -uroot ping >/dev/null 2>&1; then
    "$MYSQL_BASE/bin/mysql" --protocol=tcp -h 127.0.0.1 -P "$PORT" -uroot \
      -e "CREATE DATABASE IF NOT EXISTS perfectly CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
    echo "MySQL ready on port $PORT"
    exit 0
  fi
  sleep 1
done

echo "MySQL failed to start. Check $RUN_DIR/mysqld.log" >&2
exit 1
