# Quick Start: Deploy Worker to Railway

This is the fastest way to get your BullMQ worker running in production.

## Prerequisites
- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- Environment variables from your Vercel deployment

## Steps (5 minutes)

### 1. Push Your Code to GitHub
```bash
git add .
git commit -m "Add worker deployment configuration"
git push origin main
```

### 2. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `InterviewApp` repository
5. Railway auto-detects `railway.json` and `Dockerfile.worker`

### 3. Configure Environment Variables

Click on your service → Variables tab → Add these:

```env
NODE_ENV=production

# Redis (from Upstash Dashboard)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Supabase (from Vercel env vars or Supabase Dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (from OpenAI Dashboard)
OPENAI_API_KEY=sk-...

# Optional: Error Tracking
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENV=production
SENTRY_TRACES_SAMPLE_RATE=0.05

# Optional: Analytics
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com
```

### 4. Deploy
Railway automatically deploys after you add environment variables.

### 5. Verify Deployment
Click "View Logs" in Railway dashboard. Look for:
```
[Worker] Evaluation worker started, listening to queue: evaluation-jobs
```

### 6. Test End-to-End
1. Go to your Vercel app
2. Submit an evaluation request
3. Watch Railway logs show job processing
4. Verify result appears in your app

## Done! 🎉

Your worker is now running 24/7 on Railway, processing jobs from your Vercel app.

## Common Issues

### "Cannot connect to Redis"
- Double-check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Verify format: URL should start with `https://`

### "Worker starts but jobs aren't processing"
- Verify your Vercel app has the same Redis credentials
- Check Upstash dashboard to see if jobs are being added to queue

### "Build failed"
- Make sure you pushed `Dockerfile.worker` and `railway.json`
- Check Railway build logs for specific errors

## Cost
- Railway gives you $5 free credit per month
- Worker typically costs $1-3/month on Railway
- Free tier is often sufficient for development/low-traffic apps

## Next Steps
- Set up monitoring alerts in Railway
- Configure auto-scaling if needed
- Review comprehensive guide in `WORKER_DEPLOYMENT.md`
