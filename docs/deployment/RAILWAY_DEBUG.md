# Railway Deployment Debugging Guide

## Accessing Railway Logs and Variables

### Option 1: Railway Dashboard (Easiest)

1. **View Logs:**
   - Go to https://railway.app
   - Navigate to your project
   - Click on the **worker** service
   - Click **Logs** tab
   - Check for recent deployment/startup errors

2. **View Variables:**
   - Go to your Railway project
   - Click **Variables** tab (project level for shared variables)
   - Or click on **worker** service → **Variables** tab (service-specific variables)
   - Verify all required variables are set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `UPSTASH_REDIS_REST_URL` (if using Upstash)
     - `UPSTASH_REDIS_REST_TOKEN` (if using Upstash)
     - `REDIS_URL` (if using Railway Redis)
     - `OPENAI_API_KEY`
     - `NODE_ENV=production`

### Option 2: Railway CLI

If Railway CLI is authenticated:

```bash
# List projects
railway list

# Link to project (if not linked)
cd /workspaces/InterviewApp
railway link

# View logs for worker service
railway logs --service worker

# List variables
railway variables

# View variables for specific service
railway variables --service worker
```

### Option 3: Railway API

You can also use Railway's GraphQL API directly (requires API token).

## Common Deployment Issues

### Issue: Environment Variables Not Found

**Symptoms:**
- Error: `NEXT_PUBLIC_SUPABASE_URL: NEXT_PUBLIC_SUPABASE_URL must be a valid URL (not set)`
- Worker fails to start

**Solution:**
1. Check Railway Dashboard → Project → Variables
2. Ensure variables are set as **Shared Variables** (available to all services)
3. OR set them as service-specific variables on the worker service
4. Verify variable names match exactly (case-sensitive)
5. Check for typos or extra whitespace

### Issue: Dynamic require of "fs" Error

**Symptoms:**
- `Error: Dynamic require of "fs" is not supported`

**Solution:**
- ✅ **Fixed**: Removed `dotenv` from bundle
- Rebuild and redeploy worker

### Issue: Worker File Not Found

**Symptoms:**
- `Cannot find module '/app/dist/worker.js'`

**Solution:**
- ✅ **Fixed**: Updated build script to use esbuild bundling
- Ensure `scripts/build-worker.mjs` runs during Docker build

## Required Environment Variables Checklist

### For Worker Service:

**Required:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- ✅ `NODE_ENV=production` - Set to production

**Required (Choose one Redis option):**

**Option A: Upstash Redis**
- ✅ `UPSTASH_REDIS_REST_URL` - Upstash REST URL
- ✅ `UPSTASH_REDIS_REST_TOKEN` - Upstash REST token

**Option B: Railway Redis**
- ✅ `REDIS_URL` - Railway automatically provides this

**Required for Evaluations:**
- ✅ `OPENAI_API_KEY` - OpenAI API key

**Optional:**
- `SENTRY_DSN` - Sentry error tracking
- `POSTHOG_API_KEY` - PostHog analytics
- `POSTHOG_HOST` - PostHog host (default: https://us.i.posthog.com)

## Debugging Steps

1. **Check Build Logs:**
   - Railway Dashboard → Worker Service → Deployments
   - Click on latest deployment
   - Check if build succeeded

2. **Check Runtime Logs:**
   - Railway Dashboard → Worker Service → Logs
   - Look for startup errors
   - Check environment validation errors

3. **Verify Variables:**
   - Railway Dashboard → Variables
   - Compare with required variables list above
   - Check if variables are shared or service-specific

4. **Test Locally (if possible):**
   ```bash
   # Set all environment variables
   export NEXT_PUBLIC_SUPABASE_URL=...
   export NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   # ... etc

   # Build worker
   pnpm run build:worker

   # Run worker
   node dist/worker.js
   ```

## Getting Help

If deployment still fails:

1. Copy the exact error message from Railway logs
2. Check which environment variables are missing/invalid
3. Verify Railway service configuration
4. Check Dockerfile.worker build process
5. Ensure all dependencies are installed correctly
