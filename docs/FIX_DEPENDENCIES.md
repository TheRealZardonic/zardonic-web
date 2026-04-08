# Fix Vite Module Resolution Error

## Error Description
```
Cannot find module '/workspaces/spark-template/node_modules/vite/dist/node/chunks/dist.js' 
imported from /workspaces/spark-template/node_modules/vite/dist/node/chunks/config.js
```

This error indicates that Vite's internal module structure in `node_modules` is corrupted or incomplete.

## Solution

Run these commands in your terminal to fix the issue:

### Method 1: Clean Reinstall (Recommended)
```bash
# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
npm install
```

### Method 2: Rebuild Vite Only
```bash
# Remove only Vite
rm -rf node_modules/vite

# Reinstall
npm install
```

### Method 3: Force Reinstall
```bash
# Force reinstall all dependencies
npm ci --force
```

## Verification

After running one of the methods above, verify the fix:

```bash
# Check if Vite is properly installed
ls -la node_modules/vite/dist/node/chunks/

# You should see dist.js in the output
```

## Start Development Server

Once fixed, start the dev server:

```bash
npm run dev
```

## If Issues Persist

1. Check Node.js version (should be >= 18):
   ```bash
   node --version
   ```

2. Check npm version:
   ```bash
   npm --version
   ```

3. Try using a different package manager:
   ```bash
   # Using pnpm
   pnpm install
   
   # Or using yarn
   yarn install
   ```

## Prevention

To avoid this issue in the future:
- Don't interrupt package installations
- Ensure stable internet connection during installs
- Use `npm ci` instead of `npm install` in CI/CD pipelines
- Commit `package-lock.json` to version control
