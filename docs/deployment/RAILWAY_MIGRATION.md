# Railway Migration Guide

Complete guide for migrating InterviewApp from Vercel to Railway.

## Overview

This guide covers migrating both the Next.js application and BullMQ worker to Railway, consolidating your infrastructure on a single platform.

## Migration Benefits

✅ **Unified Platform**: App + Worker in one project
✅ **Simplified Operations**: Single dashboard, unified logging
✅ **Cost Efficiency**: Predictable pricing, native Postgres/Redis
✅ **Better for Workers**: Long-running processes, background jobs
✅ **Simpler Architecture**: Shared networking, easier debugging

## Prerequisites

1. Railway account ([railway.app](https://railway.app))
2. GitHub repository connected
3. All environment variables documented
4. Backup of current Vercel deployment

## Architecture

### Railway Services

1. **App Service** (Next.js)
   - Dockerfile: `Dockerfile`
   - Start Command: `node server.js` (from standalone output)
   - Port: 3000 (Railway sets PORT automatically)

2. **Worker Service** (BullMQ)
   - Dockerfile: `Dockerfile.worker`
   - Configuration: `railway.json`
   - Start Command: `node dist/infrastructure/bullmq/worker.js`

3. **Cron Service** (Optional - for cleanup tasks)
   - Dockerfile: `Dockerfile.cron`
   - Configuration: `railway.cron.json`
   - Schedule: Daily at 2 AM UTC

## Step-by-Step Migration

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your InterviewApp repository

### Step 2: Configure App Service

Railway will auto-detect the `Dockerfile` in the root and create the app service.

1. In Railway project, click "New Service"
2. Select "GitHub Repo" → Same repository
3. Railway will auto-detect `Dockerfile` → Creates App service
   - **OR** if Railway doesn't auto-detect, go to service Settings → set "Railway Config File" to `/railway.app.json`
4. Service name: `app` (or your preferred name)
5. Railway will build and deploy automatically

**Note**: Railway uses the Dockerfile in root. The `next.config.js` already has `output: "standalone"` configured, which is required for Railway. A `railway.app.json` config file is available if Railway doesn't auto-detect the Dockerfile.

### Step 3: Configure Worker Service

1. In Railway project, click "New Service"
2. Select "GitHub Repo" → Same repository
3. Railway will detect `railway.json` → Uses `Dockerfile.worker`
4. Service name: `worker`

### Step 4: Set Up Environment Variables

Configure environment variables for each service:

#### Shared Variables (Set at Project Level)

```bash
# Supabase (database and auth)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis (Upstash or Railway Redis)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# OpenAI
OPENAI_API_KEY=sk-...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
POSTHOG_HOST=https://us.posthog.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=residencyworks
SENTRY_PROJECT=javascript-nextjs

# Application
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
NODE_ENV=production
```

#### App Service Specific

```bash
PORT=3000  # Railway sets this automatically, but can override
```

#### Worker Service Specific

```bash
# Same as app service - worker needs access to same services
```

### Step 5: Configure Custom Domain (Optional)

1. Go to App service → Settings → Networking
2. Generate Railway domain or add custom domain
3. Update `NEXT_PUBLIC_APP_URL` with new domain

### Step 6: Set Up Cron Service (Optional)

For scheduled cleanup tasks:

1. Create new service → Select "GitHub Repo"
2. Railway will use `railway.cron.json` → Uses `Dockerfile.cron`
3. Service name: `cron`
4. Railway will execute on schedule: `0 2 * * *` (daily at 2 AM UTC)

**Alternative**: Use Railway's HTTP cron service or external cron service (e.g., cron-job.org) to call `/api/cleanup` endpoint.

### Step 7: Verify Deployment

1. **Check App Service**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

2. **Check Worker Logs**
   - Go to Worker service → Logs
   - Should see: "Worker started", "Processing jobs"

3. **Test Job Processing**
   - Submit a drill response
   - Verify worker processes the job
   - Check evaluation results appear

### Step 8: Update DNS (If Using Custom Domain)

1. Add CNAME record pointing to Railway domain
2. Wait for DNS propagation
3. Railway will provision SSL certificate automatically

## Environment Variables Reference

### Required Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | App | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | App, Worker | Service role key for admin operations |
| `UPSTASH_REDIS_REST_URL` | App, Worker | Redis connection URL |
| `UPSTASH_REDIS_REST_TOKEN` | App, Worker | Redis auth token |
| `OPENAI_API_KEY` | Worker | OpenAI API key for evaluations |
| `NEXT_PUBLIC_APP_URL` | App | Public URL of the application |
| `NODE_ENV` | App, Worker | Set to `production` |

### Optional Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | App | PostHog analytics key |
| `POSTHOG_HOST` | App | PostHog host URL |
| `NEXT_PUBLIC_SENTRY_DSN` | App | Sentry error tracking DSN |
| `SENTRY_ORG` | App | Sentry organization |
| `SENTRY_PROJECT` | App | Sentry project name |
| `PORT` | App | Override Railway's automatic PORT (default: 3000) |

### Railway Automatic Variables

Railway provides these automatically:
- `PORT` - Port the service should listen on
- `RAILWAY_ENVIRONMENT` - Environment name (production, staging, etc.)
- `RAILWAY_PROJECT_ID` - Railway project ID
- `RAILWAY_SERVICE_ID` - Service ID
- `RAILWAY_PUBLIC_DOMAIN` - Public domain for the service

## Differences from Vercel

### What Changed

1. **Deployment Model**
   - Vercel: Serverless functions, edge functions
   - Railway: Docker containers, traditional Node.js servers

2. **Build Process**
   - Vercel: Automatic Next.js build optimization
   - Railway: Uses Next.js `standalone` output (already configured)

3. **Cron Jobs**
   - Vercel: `vercel.json` cron configuration
   - Railway: Separate cron service or external cron service

4. **Environment Variables**
   - Removed: `VERCEL_URL`, `VERCEL_ENV`
   - Added: Railway automatic variables

5. **Sentry Integration**
   - Removed: `automaticVercelMonitors` (Vercel-specific)
   - Railway: Use standard Sentry cron monitoring or Railway cron

### What Stayed the Same

✅ Next.js App Router features
✅ API routes
✅ Server components
✅ Image optimization (Next.js feature, not Vercel-specific)
✅ All application logic
✅ External services (Supabase, Upstash, OpenAI)

## Monitoring & Debugging

### Viewing Logs

```bash
# Railway CLI
railway logs

# Specific service
railway logs --service app
railway logs --service worker
```

### Health Checks

- App health: `GET /api/health`
- Worker: Check logs for "Worker started" message
- Queue status: Check Redis for job counts

### Common Issues

#### Build Failures

**Issue**: Docker build fails
**Solution**:
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Check build logs in Railway dashboard

#### Port Binding

**Issue**: App not accessible
**Solution**:
- Ensure app listens on `0.0.0.0:${PORT}`
- Check Railway networking settings
- Verify custom domain configuration

#### Worker Not Processing Jobs

**Issue**: Jobs stuck in queue
**Solution**:
- Check worker logs for errors
- Verify Redis connection
- Check environment variables

#### Environment Variables

**Issue**: Missing variables
**Solution**:
- Use Railway dashboard → Variables
- Set shared variables at project level
- Service-specific variables at service level

## Rollback Plan

If you need to rollback to Vercel:

1. **Keep Vercel deployment active** during migration
2. Point DNS back to Vercel if needed
3. Restore Vercel environment variables
4. Vercel will auto-deploy from main branch

## Post-Migration Checklist

- [ ] App service deployed and accessible
- [ ] Worker service processing jobs
- [ ] Environment variables configured
- [ ] Custom domain configured (if applicable)
- [ ] Health checks passing
- [ ] Cron service running (if configured)
- [ ] Monitoring and alerts configured
- [ ] Documentation updated
- [ ] Team notified of migration

## Cost Comparison

### Vercel Pricing
- Pro: $20/month + usage
- Functions: Pay per execution
- Bandwidth: Pay per GB

### Railway Pricing
- Hobby: $5/month (starter)
- Pro: $20/month (includes more resources)
- Predictable pricing per service
- PostgreSQL and Redis included (if using Railway services)

**Note**: You can continue using Supabase (external) and Upstash Redis (external) with Railway - no requirement to migrate databases.

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Support**: https://railway.app/support
- **Railway Discord**: https://discord.gg/railway

## Next Steps

After successful migration:

1. Monitor performance and costs
2. Set up Railway alerts
3. Configure backup strategies
4. Update runbooks with Railway procedures
5. Consider migrating to Railway Postgres/Redis (optional)

---

**Migration Date**: [Date]
**Migrated By**: [Name]
**Status**: ✅ Complete / ⚠️ In Progress / ❌ Rollback Needed
