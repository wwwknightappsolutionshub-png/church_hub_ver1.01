#!/usr/bin/env bash
# Decrypt a Church Hub at-rest backup envelope (CHB1 AES-256-GCM) to stdout.
# Usage:
#   BACKUP_ENCRYPTION_KEY=<64-hex-or-base64> ./scripts/ops/backup-decrypt.sh path/to/file.sql.gz.enc > out.sql.gz
set -euo pipefail

: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
IN="${1:?Usage: backup-decrypt.sh <encrypted-file>}"

node --input-type=module -e '
import { createDecipheriv, timingSafeEqual } from "crypto";
import { readFileSync } from "fs";

const rawKey = process.env.BACKUP_ENCRYPTION_KEY.trim();
let key;
if (/^[0-9a-fA-F]{64}$/.test(rawKey)) key = Buffer.from(rawKey, "hex");
else {
  const b64 = Buffer.from(rawKey, "base64");
  if (b64.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY must be 32 bytes");
  key = b64;
}

const blob = readFileSync(process.argv[1]);
const magic = Buffer.from("CHB1");
if (blob.length < 4 + 12 + 16 || !timingSafeEqual(blob.subarray(0, 4), magic)) {
  process.stdout.write(blob);
  process.exit(0);
}
const iv = blob.subarray(4, 16);
const tag = blob.subarray(blob.length - 16);
const ciphertext = blob.subarray(16, blob.length - 16);
const decipher = createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(tag);
process.stdout.write(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
' "$IN"
