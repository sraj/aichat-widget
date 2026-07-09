#!/bin/bash
# Bundle size checker script
# Usage: ./scripts/check-bundle.sh

set -e

echo "🔨 Building widget..."
npx pnpm build 2>&1 | tail -5

cd packages/widget/dist

if [ ! -f "ai-chat-widget.umd.js" ]; then
  echo "❌ Build failed - UMD bundle not found"
  exit 1
fi

# Calculate sizes
UMD_SIZE=$(wc -c < ai-chat-widget.umd.js | tr -d ' ')
ESM_SIZE=$(wc -c < ai-chat-widget.es.js | tr -d ' ')
UMD_GZ=$(gzip -c ai-chat-widget.umd.js | wc -c | tr -d ' ')
ESM_GZ=$(gzip -c ai-chat-widget.es.js | wc -c | tr -d ' ')

# Convert to KB
UMD_KB=$(echo "scale=2; $UMD_SIZE/1024" | bc)
ESM_KB=$(echo "scale=2; $ESM_SIZE/1024" | bc)
UMD_GZ_KB=$(echo "scale=2; $UMD_GZ/1024" | bc)
ESM_GZ_KB=$(echo "scale=2; $ESM_GZ/1024" | bc)

# Calculate compression ratio
UMD_RATIO=$(echo "scale=1; (1 - $UMD_GZ/$UMD_SIZE) * 100" | bc)
ESM_RATIO=$(echo "scale=1; (1 - $ESM_GZ/$ESM_SIZE) * 100" | bc)

echo ""
echo "📦 Bundle Size Report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "UMD (CDN):"
echo "  Raw:     ${UMD_KB} KB"
echo "  Gzipped: ${UMD_GZ_KB} KB (${UMD_RATIO}% compression)"
echo ""
echo "ESM (NPM):"
echo "  Raw:     ${ESM_KB} KB"
echo "  Gzipped: ${ESM_GZ_KB} KB (${ESM_RATIO}% compression)"
echo ""

# Check against targets
TARGET_KB=30
TARGET_BYTES=$((TARGET_KB * 1024))

if [ "$UMD_GZ" -gt "$TARGET_BYTES" ]; then
  OVER=$(echo "scale=2; ($UMD_GZ - $TARGET_BYTES)/1024" | bc)
  echo "⚠️  Warning: UMD bundle exceeds ${TARGET_KB}KB target by ${OVER}KB"
  echo ""
else
  echo "✅ Bundle size is within target (< ${TARGET_KB}KB gzipped)"
  echo ""
fi

# Alert threshold
ALERT_KB=40
ALERT_BYTES=$((ALERT_KB * 1024))

if [ "$UMD_GZ" -gt "$ALERT_BYTES" ]; then
  echo "❌ ALERT: Bundle exceeds ${ALERT_KB}KB! Immediate optimization needed!"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips:"
echo "  - Run 'npx source-map-explorer dist/*.js' for detailed analysis"
echo "  - See BUNDLE-ANALYSIS.md for optimization guide"
echo ""
