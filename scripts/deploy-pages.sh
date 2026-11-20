#!/usr/bin/env bash
# Interim deploy: build and force-push dist/ to the gh-pages branch.
# Replaced by .github/workflows/deploy.yml once the gh token has the `workflow` scope.
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
npm run build
rev=$(git rev-parse --short HEAD)
remote=$(git remote get-url origin)
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $rev"
git push -q -f "$remote" gh-pages
rm -rf .git
echo "Deployed $rev to gh-pages"
