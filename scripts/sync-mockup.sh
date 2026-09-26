#!/usr/bin/env bash
# 把 Winter 原型裡的「純展示」程式碼搬進 app/src（依 design/mockup/README.md 的「請複製」清單）。
# 不搬：App.tsx、fixtures/。App 自己維護的檔案列在 KEEP，不會被覆蓋。
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=../design/mockup/src
KEEP=(components/SampleBadge.tsx screens/Onboarding.tsx lib/utils.ts)
tmp=$(mktemp -d)
for k in "${KEEP[@]}"; do [ -f "src/$k" ] && mkdir -p "$tmp/$(dirname "$k")" && cp "src/$k" "$tmp/$k"; done
rm -rf src/screens src/components src/lib/rules.ts src/lib/format.ts src/lib/describe.ts src/lib/age.ts
mkdir -p src/lib
cp -r "$SRC/screens" "$SRC/components" src/
cp "$SRC"/lib/*.ts src/lib/
cp "$SRC/types.ts" src/types.ts
cp -r "$tmp"/. src/ 2>/dev/null || true
rm -rf "$tmp"
if grep -rn "fixtures/" src --include=*.ts --include=*.tsx; then echo "有檔案 import 了 fixtures/，請修正" >&2; exit 1; fi
echo "已同步原型元件（$(ls src/screens | wc -l) 個畫面、$(ls src/components/*.tsx | wc -l) 個組合元件）"
