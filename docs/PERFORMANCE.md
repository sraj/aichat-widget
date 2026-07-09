# Performance & Optimization

Comprehensive guide to analyzing, optimizing, and maintaining the AI Chat Widget's bundle size and performance.

---

## Table of Contents

1. [Current Bundle Stats](#current-bundle-stats)
2. [Bundle Analysis Tools](#bundle-analysis-tools)
3. [Bundle Composition](#bundle-composition)
4. [Size Tracking](#size-tracking)
5. [Optimization Checklist](#optimization-checklist)
6. [Performance Best Practices](#performance-best-practices)

---

## Current Bundle Stats

### Production Build

**Latest Build:**
- **UMD (CDN)**: 117.52 KB → **31.75 KB gzipped** ⚠️
- **ESM (npm)**: 206.57 KB → **41.91 KB gzipped**

**Target**: < 30 KB gzipped for UMD (CDN usage)

**Status**: ⚠️ **Over target by 1.75 KB**

### Quick Size Check

```bash
# Build and show sizes
pnpm build

# Manual gzip check
cd packages/widget/dist
gzip -c ai-chat-widget.umd.js | wc -c
```

**Expected Output:**
```
dist/ai-chat-widget.umd.js  110.62 kB │ gzip: 29.86 kB
dist/ai-chat-widget.es.js   206.57 kB │ gzip: 41.91 kB
```
Warning: UMD bundle exceeds 30KB target by ~1.75KB

---

## Bundle Analysis Tools

### 1. Rollup Plugin Visualizer

**Install:**
```bash
cd packages/widget
pnpm add -D rollup-plugin-visualizer
```

**Configure:**
```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    preact(),
    visualizer({ 
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
});
```

**Use:**
```bash
pnpm build
# Opens browser with interactive bundle visualization
```

### 2. Source Map Explorer

**Analyze what's in the bundle:**
```bash
npx source-map-explorer packages/widget/dist/ai-chat-widget.umd.js
```

**Output:**
- Interactive treemap visualization
- Shows size of each module
- Identifies largest dependencies
- Highlights duplicate code

### 3. Webpack Bundle Analyzer

**Alternative treemap:**
```bash
npx webpack-bundle-analyzer packages/widget/dist/ai-chat-widget.umd.js
```

### 4. Bundle Phobia

**Check npm package sizes before installing:**
```bash
npx bundlephobia preact@10.20.1
# Result: ~4KB gzipped
```

**Or visit:** https://bundlephobia.com

### 5. Agadoo

**Check tree-shaking effectiveness:**
```bash
npx agadoo packages/widget/dist/ai-chat-widget.es.js
```

**Checks:**
- Is the module tree-shakeable?
- Are there side effects?
- Can dead code be eliminated?

---

## Bundle Composition

### UMD Bundle Breakdown (~118 KB uncompressed)

```
┌─────────────────────────────────────────────┐
│ Tailwind CSS        40KB (36%)  → 5KB gz    │
│ Preact + Hooks      15KB (14%)  → 5KB gz    │
│ Widget Logic        12KB (11%)  → 4KB gz    │
│ UI Components       10KB  (9%)  → 3KB gz    │
│ Connection Layer     8KB  (7%)  → 3KB gz    │
│ Utilities            5KB  (5%)  → 2KB gz    │
│ Shadow DOM           3KB  (3%)  → 1KB gz    │
│ Types & Zod          7KB  (6%)  → 2KB gz    │
│ Other               10KB  (9%)  → 4KB gz    │
└─────────────────────────────────────────────┘
Total: 118KB → 31.75KB gzipped (73% reduction)
```

### Why Gzip Compresses So Well

**Great compression (70-80%):**
- ✅ Repeated CSS patterns (Tailwind utilities)
- ✅ Minified code with patterns
- ✅ String literals
- ✅ Variable names (before minification)

**Poor compression (20-30%):**
- ❌ Already compressed data
- ❌ Random/unique strings
- ❌ Binary data

**Our widget:** 73% compression (excellent!)

### Largest Dependencies

1. **Tailwind CSS** - 40KB (5KB gz)
   - Most CSS is unused and purged
   - Remaining classes compress well
   
2. **Preact** - 15KB (5KB gz)
   - Minimal React alternative
   - Excellent size/feature ratio

3. **Widget Business Logic** - 12KB (4KB gz)
   - Connections, hooks, state management
   - Already optimized

---

## Size Tracking

### Track Size Over Time

#### **Create Baseline**

```bash
#!/bin/bash
# Save as: scripts/baseline.sh

pnpm build
SIZE=$(gzip -c packages/widget/dist/ai-chat-widget.umd.js | wc -c)
echo $SIZE > .bundle-size-baseline
echo "✅ Baseline set: $SIZE bytes"
```

#### **Compare Changes**

```bash
#!/bin/bash
# Save as: scripts/check-size.sh

pnpm build

CURRENT=$(gzip -c packages/widget/dist/ai-chat-widget.umd.js | wc -c)
BASELINE=$(cat .bundle-size-baseline)
DIFF=$((CURRENT - BASELINE))

echo "Current:  $CURRENT bytes ($(echo "scale=2; $CURRENT/1024" | bc)KB)"
echo "Baseline: $BASELINE bytes ($(echo "scale=2; $BASELINE/1024" | bc)KB)"
echo "Diff:     $DIFF bytes"

if [ $DIFF -gt 1024 ]; then
  echo "⚠️  Bundle grew by more than 1KB!"
  exit 1
else
  echo "✅ Bundle size acceptable"
fi
```

### CI Integration (GitHub Actions)

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  check-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9.1.0
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install & Build
        run: |
          pnpm install
          pnpm build
      
      - name: Check Bundle Size
        run: |
          SIZE=$(gzip -c packages/widget/dist/ai-chat-widget.umd.js | wc -c)
          SIZE_KB=$(echo "scale=2; $SIZE/1024" | bc)
          
          echo "📦 Bundle Size: $SIZE bytes ($SIZE_KB KB)"
          
          # Fail if over 35KB gzipped (with buffer)
          if [ $SIZE -gt 35840 ]; then
            echo "❌ Bundle exceeds 35KB limit!"
            exit 1
          fi
          
          echo "✅ Bundle size is acceptable"
      
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const size = fs.statSync('packages/widget/dist/ai-chat-widget.umd.js').size;
            const gzipSize = /* calculate gzip size */;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `📦 **Bundle Size Report**
              
              | Format | Size | Gzipped |
              |--------|------|---------|
              | UMD | ${(size/1024).toFixed(2)} KB | ${(gzipSize/1024).toFixed(2)} KB |
              
              ${gzipSize < 30720 ? '✅' : '⚠️'} Target: < 30 KB gzipped`
            });
```

### Size Limit Tool

**Install:**
```bash
pnpm add -D @size-limit/preset-small-lib
```

**Configure:**
```json
// package.json
{
  "size-limit": [
    {
      "path": "packages/widget/dist/ai-chat-widget.umd.js",
      "limit": "35 KB",
      "gzip": true
    }
  ]
}
```

**Run:**
```bash
pnpm size-limit
```

---

## Optimization Checklist

### Vite Configuration

#### **Verify Terser Minification**

```typescript
// packages/widget/vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // ✅ Remove console.logs
        drop_debugger: true,     // ✅ Remove debuggers
        pure_funcs: ['console.log'], // ✅ Remove specific functions
      },
      mangle: {
        safari10: true,          // ✅ Safari 10 compatibility
      },
    },
  },
});
```

#### **Verify No External Dependencies**

```typescript
// All dependencies should be bundled
export default defineConfig({
  build: {
    rollupOptions: {
      external: [],  // ✅ Bundle everything
    },
  },
});
```

#### **Check Tree Shaking**

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined, // ✅ Single chunk
      },
      treeshake: {
        moduleSideEffects: false, // ✅ Enable aggressive tree-shaking
      },
    },
  },
});
```

### Tailwind Configuration

#### **Verify Content Scanning**

```javascript
// packages/widget/tailwind.config.js
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../ui/src/**/*.{js,ts,jsx,tsx}',  // ✅ Scan UI components
  ],
  // ...
};
```

#### **Verify PurgeCSS**

```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: ['default', {
          discardComments: { removeAll: true },
        }],
      },
    }),
  },
};
```

### Dependency Audit

#### **Check Installed Dependencies**

```bash
cd packages/widget
pnpm list --prod --depth=0
```

**Expected (minimal):**
```
@aichat-widget/ui
@aichat-widget/shared
preact
```

#### **Find Unused Dependencies**

```bash
npx depcheck
```

#### **Check for Duplicate Dependencies**

```bash
npx duplicate-package-checker-webpack-plugin
```

#### **Find Large Dependencies**

```bash
du -sh node_modules/* | sort -h | tail -10
```

### CSS Analysis

#### **Extract and Count Classes**

```bash
cd packages/widget/dist
grep -o "\.[a-zA-Z0-9_-]*{" ai-chat-widget.umd.js | sort | uniq > css-classes.txt
wc -l css-classes.txt
```

#### **Check for Unused Tailwind Classes**

```bash
# Compare generated classes with source usage
cd packages
grep -r "className=" ui/src widget/src | \
  grep -o 'className="[^"]*"' | \
  sort | uniq > classes-used.txt

# Compare with generated CSS
```

---

## Performance Best Practices

### Build Optimization

#### **1. Enable Production Mode**

```bash
NODE_ENV=production pnpm build
```

#### **2. Source Maps**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: process.env.NODE_ENV !== 'production', // ✅ Only in dev
  },
});
```

#### **3. Code Splitting (for ESM)**

```typescript
// For ESM build, split vendor code
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['preact'],  // Separate vendor chunk
        },
      },
    },
  },
});
```

### Runtime Optimization

#### **1. Lazy Loading**

```typescript
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Skeleton />}>
  <HeavyComponent />
</Suspense>
```

#### **2. Memoization**

```typescript
// Memoize expensive computations
const memoizedValue = useMemo(() => {
  return expensiveComputation(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

#### **3. Virtual Scrolling**

For long message lists:
```typescript
// Consider react-window or react-virtual
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  )}
</FixedSizeList>
```

### Network Optimization

#### **1. CDN Configuration**

```nginx
# nginx config for CDN
location /ai-chat-widget.js {
  add_header Cache-Control "public, max-age=31536000, immutable";
  add_header Access-Control-Allow-Origin "*";
  gzip on;
  gzip_types application/javascript;
  brotli on;
  brotli_types application/javascript;
}
```

#### **2. HTTP/2 Server Push**

```html
<!-- Preload widget script -->
<link rel="preload" href="https://cdn.example.com/ai-chat-widget.js" as="script">
```

#### **3. Resource Hints**

```html
<!-- DNS prefetch for API -->
<link rel="dns-prefetch" href="https://api.example.com">

<!-- Preconnect for API -->
<link rel="preconnect" href="https://api.example.com">
```

### Loading Strategies

#### **1. Defer Script Loading**

```html
<!-- ✅ Recommended -->
<script defer src="https://cdn.example.com/ai-chat-widget.js"></script>
```

#### **2. Intersection Observer**

```typescript
// Load widget only when chat button is visible
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadWidget();
      observer.disconnect();
    }
  });
});

observer.observe(document.getElementById('chat-button'));
```

#### **3. Idle Loading**

```typescript
// Load widget when browser is idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => loadWidget());
} else {
  setTimeout(() => loadWidget(), 1);
}
```

---

## Monitoring & Debugging

### Performance Monitoring

#### **Lighthouse Scores**

```bash
# Run Lighthouse
npx lighthouse http://localhost:3000 \
  --output html \
  --output-path ./lighthouse-report.html \
  --only-categories=performance
```

**Target Scores:**
- Performance: > 90
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s

#### **Web Vitals**

```typescript
// Measure Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);  // Cumulative Layout Shift
getFID(console.log);  // First Input Delay
getFCP(console.log);  // First Contentful Paint
getLCP(console.log);  // Largest Contentful Paint
getTTFB(console.log); // Time to First Byte
```

### Bundle Analysis Script

```bash
#!/bin/bash
# Save as: scripts/analyze-bundle.sh

echo "🔨 Building..."
pnpm build

cd packages/widget/dist

UMD_SIZE=$(wc -c < ai-chat-widget.umd.js)
ESM_SIZE=$(wc -c < ai-chat-widget.es.js)
UMD_GZ=$(gzip -c ai-chat-widget.umd.js | wc -c)
ESM_GZ=$(gzip -c ai-chat-widget.es.js | wc -c)

echo ""
echo "📦 Bundle Sizes:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "UMD: $(echo "scale=2; $UMD_SIZE/1024" | bc)KB → $(echo "scale=2; $UMD_GZ/1024" | bc)KB gz"
echo "ESM: $(echo "scale=2; $ESM_SIZE/1024" | bc)KB → $(echo "scale=2; $ESM_GZ/1024" | bc)KB gz"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $UMD_GZ -gt 30720 ]; then
  echo "⚠️  UMD bundle exceeds 30KB gzipped target"
  exit 1
else
  echo "✅ Bundle size meets target!"
fi
```

---

## Before Release Checklist

Performance checks before releasing:

- [ ] Run `pnpm build` in production mode
- [ ] Verify bundle size < 30KB gzipped (UMD)
- [ ] Check `drop_console: true` in terser config
- [ ] Confirm no source maps in production build
- [ ] Run Lighthouse audit (score > 90)
- [ ] Test bundle on real CDN
- [ ] Verify Shadow DOM CSS isolation working
- [ ] Test on page with same dependencies (no conflicts)
- [ ] Check browser console for errors
- [ ] Verify loading doesn't block page render
- [ ] Test on slow 3G connection
- [ ] Check Web Vitals meet targets

---

## Useful Tools Summary

| Tool | Purpose | Command |
|------|---------|---------|
| **source-map-explorer** | Visual bundle analysis | `npx source-map-explorer dist/*.js` |
| **rollup-plugin-visualizer** | Interactive bundle map | Add to vite.config.ts |
| **webpack-bundle-analyzer** | Treemap visualization | `npx webpack-bundle-analyzer` |
| **bundlephobia** | Check npm package sizes | `npx bundlephobia <package>` |
| **agadoo** | Check tree-shaking | `npx agadoo dist/*.js` |
| **size-limit** | Size checking in CI | `npx size-limit` |
| **lighthouse** | Performance audit | `npx lighthouse <url>` |
| **web-vitals** | Core Web Vitals | Import in code |

---

## Troubleshooting

### Bundle Size Increased?

1. **Check what changed:**
   ```bash
   npx source-map-explorer dist/*.js
   ```

2. **Check for new dependencies:**
   ```bash
   pnpm list --prod --depth=0
   ```

3. **Check for duplicate dependencies:**
   ```bash
   npx duplicate-package-checker
   ```

4. **Verify terser is active:**
   ```bash
   cat vite.config.ts | grep -A 5 "terser"
   ```

5. **Check if Tailwind purge is working:**
   ```bash
   cat postcss.config.js
   ```

### Bundle Not Minified?

```bash
# Check NODE_ENV
echo $NODE_ENV  # Should be "production"

# Build with explicit production flag
NODE_ENV=production pnpm build
```

### Source Maps in Production?

```typescript
// vite.config.ts - disable in production
build: {
  sourcemap: false,  // or process.env.NODE_ENV !== 'production'
}
```

---

## Related Documentation

- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Security**: [SECURITY.md](./SECURITY.md)
- **Main README**: [README.md](../README.md)
