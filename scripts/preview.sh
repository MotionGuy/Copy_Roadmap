#!/bin/sh
# Serve the site from this folder so it can be opened in a browser before pushing.
# Usage:  sh scripts/preview.sh [port]      then open http://localhost:8000
#
# Signing in and sync work as on the real site. The two things under /api (live weather, the Canvas feed)
# only exist on Vercel, so here the backdrop falls back to its second weather source and Canvas does not refresh.
cd "$(dirname "$0")/.." || exit 1
PORT="${1:-8000}"
echo "Roadmap preview at http://localhost:$PORT  (Ctrl+C to stop)"
exec python3 -m http.server "$PORT"
