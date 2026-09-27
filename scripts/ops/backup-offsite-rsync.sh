#!/usr/bin/env bash
# Mirror Church Hub backup storage to a secondary host over SSH.
# Copies ciphertext as-is (do not decrypt on the wire). Restrict the SSH key
# to this path only (ForceCommand / rsync-only) when possible.
#
# Required env:
#   BACKUP_STORAGE_ROOT   local backup root (e.g. /var/churchhub/backups)
#   BACKUP_OFFSITE_SSH    user@backup-vps
#   BACKUP_OFFSITE_PATH   remote directory (e.g. /var/churchhub/backups)
#
# Optional:
#   BACKUP_OFFSITE_SSH_KEY  path to private key (-i)
#   BACKUP_OFFSITE_RSYNC_OPTS  extra rsync flags
set -euo pipefail

: "${BACKUP_STORAGE_ROOT:?BACKUP_STORAGE_ROOT is required}"
: "${BACKUP_OFFSITE_SSH:?BACKUP_OFFSITE_SSH is required (user@host)}"
: "${BACKUP_OFFSITE_PATH:?BACKUP_OFFSITE_PATH is required}"

SRC="${BACKUP_STORAGE_ROOT%/}/"
DEST="${BACKUP_OFFSITE_SSH}:${BACKUP_OFFSITE_PATH%/}/"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes)
if [ -n "${BACKUP_OFFSITE_SSH_KEY:-}" ]; then
  SSH_OPTS+=(-i "$BACKUP_OFFSITE_SSH_KEY")
fi

echo "Syncing $SRC -> $DEST"
# shellcheck disable=SC2086
rsync -az --delete \
  --chmod=Du=rwx,Dgo=,Fu=rw,Fgo= \
  -e "ssh ${SSH_OPTS[*]}" \
  ${BACKUP_OFFSITE_RSYNC_OPTS:-} \
  "$SRC" "$DEST"

echo "Offsite sync complete."
