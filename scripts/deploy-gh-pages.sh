#!/usr/bin/env bash
# 把 dist/ 發佈到 gh-pages 分支（GitHub Pages 來源：gh-pages / root）。
# 用法：SICILY_CARE_GITHUB_TOKEN=... ./scripts/deploy-gh-pages.sh
# VITE_GAS_URL：優先用環境變數；沒有就讀 repo variable；都沒有就以「本機試用」模式建置。
# token 只透過 credential helper 從環境變數讀，不會寫進 remote URL 或任何檔案。
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${REPO:-Brian-Konr/sicily-care}"
: "${SICILY_CARE_GITHUB_TOKEN:?需要 SICILY_CARE_GITHUB_TOKEN}"
if [ -z "${VITE_GAS_URL:-}" ]; then
  VITE_GAS_URL="$(GH_TOKEN="$SICILY_CARE_GITHUB_TOKEN" gh api "repos/$REPO/actions/variables/VITE_GAS_URL" --jq .value 2>/dev/null || true)"
fi
export VITE_GAS_URL BASE="/${REPO#*/}/"
echo "[deploy] BASE=$BASE  模式：$([ -n "$VITE_GAS_URL" ] && echo 連線 Apps Script || echo 本機試用)"
npm test
npm run build
touch dist/.nojekyll
SHA="$(git rev-parse --short HEAD)"
TMP="$(mktemp -d)"
cp -r dist/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name)" -c user.email="$(git -C "$OLDPWD" config user.email)" commit -qm "deploy $SHA"
git -c credential.helper= -c 'credential.helper=!f() { echo username=x-access-token; echo "password=$SICILY_CARE_GITHUB_TOKEN"; }; f' \
  push -f "https://github.com/$REPO.git" gh-pages
rm -rf "$TMP"
echo "[deploy] 已推到 gh-pages（$SHA）"
