#!/usr/bin/env bash
# =============================================================================
# cf-provision — one-shot Cloudflare resource setup
# =============================================================================
# Creates every Cloudflare resource the project depends on:
#
#   D1:         communicare-db
#   KV:         CACHE, SESSIONS, RATELIMIT  (3 namespaces)
#   R2:         farm-photos, product-photos, imports  (3 buckets)
#   Vectorize:  communicare-embeddings  (384-dim, cosine)
#
# Idempotent — re-running shows which resources already exist instead of
# erroring on the duplicates. Captures every ID that needs to land in
# `wrangler.jsonc` and prints sed commands at the end to apply them.
#
# Prereqs:
#   * `wrangler login` (run separately if you haven't)
#   * @cloudflare/workers-types and wrangler installed (already in
#     devDependencies)
#
# Usage:
#   npm run cf:provision
# =============================================================================

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$ROOT/wrangler.jsonc"

c_green=$'\033[1;32m'
c_yellow=$'\033[1;33m'
c_red=$'\033[1;31m'
c_dim=$'\033[2m'
c_reset=$'\033[0m'

note()  { echo "${c_dim}— $*${c_reset}"; }
ok()    { echo "${c_green}✓ $*${c_reset}"; }
warn()  { echo "${c_yellow}! $*${c_reset}"; }
fail()  { echo "${c_red}✗ $*${c_reset}"; }

# Extract a UUID-shaped ID from anywhere in a blob of text.
extract_uuid() {
  echo "$1" | grep -oE '[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}|[0-9a-f]{32}' \
            | head -n 1 || true
}

# Wrangler login check
if ! npx wrangler whoami >/dev/null 2>&1; then
  fail "Not logged into Cloudflare. Run \`npx wrangler login\` first, then re-run this script."
  exit 1
fi

ACCOUNT_LINE="$(npx wrangler whoami 2>&1 | grep -i 'associated email\|account name' | head -2)"
echo "$ACCOUNT_LINE"
echo

# -----------------------------------------------------------------------------
# D1
# -----------------------------------------------------------------------------
echo "${c_green}==> D1${c_reset}  communicare-db"
D1_OUT="$(npx wrangler d1 create communicare-db 2>&1 || true)"
echo "$D1_OUT" | sed 's/^/    /'
D1_ID="$(extract_uuid "$D1_OUT")"
if [ -n "$D1_ID" ]; then
  ok "D1 database_id: $D1_ID"
else
  # Maybe it already exists; try to look it up
  EXISTING="$(npx wrangler d1 list 2>&1 || true)"
  D1_ID="$(echo "$EXISTING" | awk '/communicare-db/ { print $2; exit }')"
  if [ -n "$D1_ID" ]; then
    ok "D1 database_id (existing): $D1_ID"
  else
    warn "Couldn't extract a D1 database_id from the output above. You'll need to paste it manually."
  fi
fi
echo

# -----------------------------------------------------------------------------
# KV
# -----------------------------------------------------------------------------
declare -A KV_IDS
for NS in CACHE SESSIONS RATELIMIT; do
  echo "${c_green}==> KV${c_reset}  $NS"
  OUT="$(npx wrangler kv namespace create "$NS" 2>&1 || true)"
  echo "$OUT" | sed 's/^/    /'
  ID="$(extract_uuid "$OUT")"
  if [ -n "$ID" ]; then
    KV_IDS[$NS]="$ID"
    ok "$NS id: $ID"
  else
    # Look it up among existing
    LIST="$(npx wrangler kv namespace list 2>&1 || true)"
    ID="$(echo "$LIST" | python3 -c "
import json, sys, re
try:
    text = sys.stdin.read()
    # wrangler outputs a JSON array; trim leading lines if needed
    start = text.find('[')
    if start < 0:
        sys.exit(0)
    data = json.loads(text[start:])
    name = '${NS}'
    for ns in data:
        title = ns.get('title','')
        if title.endswith('_' + name) or title == name:
            print(ns.get('id',''))
            break
except Exception as e:
    pass
" 2>/dev/null)"
    if [ -n "$ID" ]; then
      KV_IDS[$NS]="$ID"
      ok "$NS id (existing): $ID"
    else
      warn "$NS id not found. You'll need to paste it manually."
    fi
  fi
  echo
done

# -----------------------------------------------------------------------------
# R2
# -----------------------------------------------------------------------------
for BUCKET in communicare-farm-photos communicare-product-photos communicare-imports; do
  echo "${c_green}==> R2${c_reset}  $BUCKET"
  OUT="$(npx wrangler r2 bucket create "$BUCKET" 2>&1 || true)"
  echo "$OUT" | sed 's/^/    /'
  if echo "$OUT" | grep -qiE 'created|already exists'; then
    ok "$BUCKET ready"
  else
    warn "$BUCKET may not have been created — check the output."
  fi
  echo
done

# -----------------------------------------------------------------------------
# Vectorize
# -----------------------------------------------------------------------------
echo "${c_green}==> Vectorize${c_reset}  communicare-embeddings (384-dim, cosine)"
VEC_OUT="$(npx wrangler vectorize create communicare-embeddings \
  --dimensions=384 --metric=cosine 2>&1 || true)"
echo "$VEC_OUT" | sed 's/^/    /'
if echo "$VEC_OUT" | grep -qiE 'created|already exists'; then
  ok "Vectorize index ready"
else
  warn "Vectorize index may not have been created — check the output."
fi
echo

# -----------------------------------------------------------------------------
# Summary + wrangler.jsonc patch instructions
# -----------------------------------------------------------------------------
echo "${c_green}===========================================================${c_reset}"
echo "${c_green}Provisioning complete. wrangler.jsonc patches to apply:${c_reset}"
echo "${c_green}===========================================================${c_reset}"
echo

if [ -n "${D1_ID:-}" ]; then
  cat <<EOF
${c_dim}# D1${c_reset}
sed -i.bak 's|"database_id": "<TODO: wrangler d1 create>"|"database_id": "$D1_ID"|' "$CONFIG"

EOF
fi

for NS in CACHE SESSIONS RATELIMIT; do
  ID="${KV_IDS[$NS]:-}"
  if [ -n "$ID" ]; then
    cat <<EOF
${c_dim}# KV $NS${c_reset}
node --input-type=module -e "
const fs = require('node:fs');
const p = '$CONFIG';
let s = fs.readFileSync(p, 'utf8');
const pat = /(\"binding\":\\s*\"$NS\",\\s*\"id\":\\s*\")<TODO>(\")/;
s = s.replace(pat, '\$1$ID\$2');
fs.writeFileSync(p, s);
"

EOF
  fi
done

cat <<EOF
${c_green}Next steps:${c_reset}
  1. Review the diff:                 ${c_dim}git diff wrangler.jsonc${c_reset}
  2. Run D1 migrations:               ${c_dim}npm run d1:migrate${c_reset}
  3. Verify bindings are wired:       ${c_dim}curl https://communicare.farm/api/_health | jq${c_reset}
  4. (Once you have a Resend account) add SMTP creds to Supabase Auth
     and set TURNSTILE_SECRET + NEXT_PUBLIC_TURNSTILE_SITE_KEY in the
     CF Pages dashboard env vars.
EOF
