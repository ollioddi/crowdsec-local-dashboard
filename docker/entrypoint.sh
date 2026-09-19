#!/bin/sh
# Applies pending migrations, then execs the server so it owns the PID and
# receives SIGTERM directly.
set -eu

DATA_DIR=/data

if [ -d "$DATA_DIR" ] && [ ! -w "$DATA_DIR" ]; then
	cat >&2 <<MSG
$DATA_DIR is not writable by $(id -un) (uid $(id -u)).

Releases before 0.5.0 ran as root and left the database owned by root.
Fix the ownership once, then start the container again:

  docker compose run --rm --user root --cap-add CHOWN --entrypoint chown dashboard -R node:node $DATA_DIR
MSG
	exit 1
fi

if ! output=$(node_modules/.bin/prisma migrate deploy 2>&1); then
	printf '%s\n' "$output" >&2
	case "$output" in
	*P3005*)
		cat >&2 <<MSG

This database was created by a release before v0.3.0-beta and has no
migration history, so it cannot be upgraded in place. Start over with an
empty volume, then create the admin account again:

  docker compose down -v && docker compose up -d
MSG
		;;
	esac
	exit 1
fi
printf '%s\n' "$output"

exec "$@"
