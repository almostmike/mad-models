#!/bin/sh
# Render the Open Graph image (1200x630) from tools/og/og.html with headless
# Chrome, then save it as public/og.jpg. Run from the repo root:
#   sh tools/og/render.sh
set -e
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=8000 \
  --screenshot="$PWD/public/og.png" "file://$PWD/tools/og/og.html"
sips -s format jpeg -s formatOptions 84 "$PWD/public/og.png" --out "$PWD/public/og.jpg" >/dev/null
rm "$PWD/public/og.png"
echo "wrote public/og.jpg"
