#!/usr/bin/env bash
set -euo pipefail

CFG="wrangler-cron.toml"
if [ ! -f "$CFG" ]; then
  echo "Missing $CFG in repo root" >&2
  exit 1
fi

echo "Building (vite build if needed) ..."
# Optional: Only build if dist missing; worker itself is plain JS.
if [ ! -d dist ]; then
  if command -v npm >/dev/null 2>&1; then
    npm run build || echo "(Non-fatal) build failed or not required" >&2
  fi
fi

echo "Deploying cron worker with config $CFG ..."
npx wrangler deploy --config "$CFG" "$@"

echo "Tail logs (Ctrl+C to stop)..."
npx wrangler tail fixturecast-cron-worker --format=json --sampling-rate=1 || true
