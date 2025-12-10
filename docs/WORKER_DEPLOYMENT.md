# BullMQ Worker Deployment Guide

This guide explains how to deploy the BullMQ evaluation worker on Railway alongside the Next.js app.

## Architecture Overview

- **Next.js App**: Deployed on Railway (handles web requests, enqueues jobs)
- **BullMQ Worker**: Deployed on Railway (processes evaluation jobs)
- **Redis Queue**: Railway Redis or Upstash Redis (shared between app and worker)
- **Database**: Supabase or Railway Postgres (shared between app and worker)

## Prerequisites

1. Railway account and project
2. Next.js app service configured in Railway
3. Redis instance (Railway Redis or Upstash)
4. Supabase project (or Railway Postgres)
5. OpenAI API key
6. Sentry DSN (optional, for error tracking)
7. PostHog API key (optional, for analytics)

**Note:** See [RAILWAY_MIGRATION.md](./RAILWAY_MIGRATION.md) for complete migration guide from Vercel.

## Option 1: Deploy to Railway (Recommended)

Railway is excellent for long-running Node.js processes and has great integration with GitHub.

### Steps:

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your InterviewApp repository
   - Railway will auto-detect the `railway.json` configuration

3. **Configure Environment Variables**
   Go to your project settings and add these variables:

   ```bash
   NODE_ENV=production
   UPSTASH_REDIS_REST_URL=<your-upstash-url>
   UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   OPENAI_API_KEY=<your-openai-key>
   SENTRY_DSN=<your-sentry-dsn>
   SENTRY_ENV=production
   SENTRY_TRACES_SAMPLE_RATE=0.05
   POSTHOG_API_KEY=<your-posthog-key>
   POSTHOG_HOST=https://us.i.posthog.com
   ```

4. **Deploy**
   - Railway will automatically build using `Dockerfile.worker`
   - Monitor logs in the Railway dashboard
   - Worker will start processing jobs from the queue

5. **Verify Deployment**
   ```bash
   # Check Railway logs for:
   [Worker] Evaluation worker started, listening to queue: evaluation-jobs
   ```

### Railway CLI (Alternative)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Set environment variables
railway variables set NODE_ENV=production
railway variables set UPSTASH_REDIS_REST_URL=...
# ... set all other variables

# Deploy
railway up
```

## Option 2: Deploy to Render

Render is another excellent option with a generous free tier.

### Steps:

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Worker**
   - Click "New +" → "Background Worker"
   - Connect your GitHub repository
   - Render will auto-detect `render.yaml`

3. **Configure Settings**
   - **Name**: `interview-app-worker`
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile.worker`
   - **Plan**: Select appropriate plan (Starter or Standard)

4. **Set Environment Variables**
   Add all required environment variables in the Render dashboard:
   - Navigate to your worker service
   - Click "Environment" tab
   - Add each variable from the list above

5. **Deploy**
   - Click "Create Worker"
   - Monitor deployment logs
   - Worker will start automatically

## Option 3: Deploy to Fly.io

Fly.io is great for global edge deployment with low latency.

### Steps:

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login to Fly**
   ```bash
   fly auth login
   ```

3. **Create Fly.toml Configuration**
   ```bash
   fly launch --no-deploy --dockerfile Dockerfile.worker
   ```

4. **Configure fly.toml**
   Edit the generated `fly.toml`:
   ```toml
   app = "interview-app-worker"
   primary_region = "iad"

   [build]
     dockerfile = "Dockerfile.worker"

   [env]
     NODE_ENV = "production"
     POSTHOG_HOST = "https://us.i.posthog.com"
     SENTRY_ENV = "production"
     SENTRY_TRACES_SAMPLE_RATE = "0.05"

   [[services]]
     internal_port = 3001
     protocol = "tcp"
   ```

5. **Set Secrets**
   ```bash
   fly secrets set \
     UPSTASH_REDIS_REST_URL="your-url" \
     UPSTASH_REDIS_REST_TOKEN="your-token" \
     SUPABASE_URL="your-url" \
     SUPABASE_ANON_KEY="your-key" \
     SUPABASE_SERVICE_ROLE_KEY="your-key" \
     OPENAI_API_KEY="your-key" \
     SENTRY_DSN="your-dsn" \
     POSTHOG_API_KEY="your-key"
   ```

6. **Deploy**
   ```bash
   fly deploy
   ```

7. **Monitor**
   ```bash
   fly logs
   ```

## Option 4: Deploy to AWS ECS/Fargate

For production-grade deployments with full control.

### Steps:

1. **Build and Push Docker Image**
   ```bash
   # Build image
   docker build -f Dockerfile.worker -t interview-app-worker .

   # Tag for ECR
   docker tag interview-app-worker:latest \
     <account-id>.dkr.ecr.<region>.amazonaws.com/interview-app-worker:latest

   # Push to ECR
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/interview-app-worker:latest
   ```

2. **Create ECS Task Definition**
   - Use AWS Console or Terraform
   - Set container image to your ECR image
   - Configure environment variables
   - Set CPU/Memory limits

3. **Create ECS Service**
   - Choose Fargate launch type
   - Set desired count (1 or more for redundancy)
   - Configure auto-scaling if needed

4. **Monitor via CloudWatch**
   - View logs in CloudWatch Logs
   - Set up alarms for failures

## Required Environment Variables

All platforms need these environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Set to `production` | ✅ |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (HTTPS) | ✅ |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 | ✅ |
| `SENTRY_DSN` | Sentry error tracking DSN | ⚠️ Optional |
| `SENTRY_ENV` | Sentry environment name | ⚠️ Optional |
| `SENTRY_TRACES_SAMPLE_RATE` | Sentry trace sampling (0-1) | ⚠️ Optional |
| `POSTHOG_API_KEY` | PostHog analytics key | ⚠️ Optional |
| `POSTHOG_HOST` | PostHog host URL | ⚠️ Optional |

## Verifying the Deployment

### 1. Check Worker Logs

Look for this startup message:
```
[Worker] Evaluation worker started, listening to queue: evaluation-jobs
```

### 2. Test Job Processing

From your Vercel app, submit an evaluation request. Monitor:

**Worker logs should show:**
```
[Worker] Processing job <job-id> for request <request-id>
[Worker] Evaluating transcript (XXX chars)
[Worker] Evaluation completed: score=X, tokens=XXX
[Worker] Result persisted for request <request-id>
[Worker] Job <job-id> completed successfully
```

### 3. Check Redis Queue

Use Upstash Console to verify:
- Jobs are being added to the `evaluation-jobs` queue
- Jobs are being processed (queue drains)

### 4. Check Supabase

Verify evaluation results are being stored in your database:
- Check `evaluation_results` table
- Verify scores and feedback are persisted

## Troubleshooting

### Worker Not Starting

**Check logs for errors:**
- Missing environment variables
- Redis connection issues
- Supabase connection issues

**Fix:**
```bash
# Verify all environment variables are set
# Check Redis connectivity from worker platform
# Verify Supabase allows connections from worker IP
```

### Jobs Not Processing

**Possible causes:**
1. Worker not connected to Redis
2. Queue name mismatch
3. Redis connection timeout

**Debug:**
```bash
# Check worker logs for connection errors
# Verify UPSTASH_REDIS_REST_URL format
# Test Redis connection manually
```

### High Memory Usage

**Solution:**
- Increase worker memory allocation
- Reduce concurrency in worker.ts (currently set to 1)
- Monitor for memory leaks

### Job Timeouts

**Solution:**
- Increase platform timeout limits
- Optimize OpenAI API calls
- Add retry logic for transient failures

## Scaling Considerations

### Horizontal Scaling

Deploy multiple worker instances:
- **Railway**: Adjust replica count in settings
- **Render**: Increase instance count
- **Fly.io**: Scale with `fly scale count 3`
- **ECS**: Increase desired count

### Vertical Scaling

Increase resources per worker:
- More CPU for faster processing
- More memory for larger transcripts
- Monitor resource utilization

### Concurrency

Adjust worker concurrency in `src/infrastructure/bullmq/worker.ts`:

```typescript
{
  connection,
  concurrency: 5, // Process 5 jobs simultaneously per worker
}
```

**Note:** Higher concurrency = more CPU/memory usage

## Cost Estimates (Monthly)

| Platform | Free Tier | Paid Plans | Notes |
|----------|-----------|------------|-------|
| **Railway** | $5 credit | $5+ usage-based | Great for MVP |
| **Render** | 750 hrs free | $7-$25/month | Good free tier |
| **Fly.io** | 3 VMs free | $1.94-$62/month | Global edge |
| **Heroku** | Limited free | $7-$50/month | Easy setup |
| **AWS ECS** | Free tier | $15-$100/month | Production-grade |

## Monitoring and Observability

### Application Logs
- **Railway**: Built-in logs viewer
- **Render**: Logs tab in dashboard
- **Fly.io**: `fly logs` command
- **AWS**: CloudWatch Logs

### Error Tracking
- Sentry integration (already configured in worker)
- Check Sentry dashboard for exceptions

### Performance Metrics
- PostHog events (already configured)
- Track job duration, success rate
- Monitor queue backlog

### Health Checks

Add a health check endpoint (optional):

```typescript
// In worker.ts
import express from 'express';

const app = express();
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', queue: EVALUATION_QUEUE_NAME });
});

app.listen(3001, () => {
  console.log('[Worker] Health check server running on port 3001');
});
```

## CI/CD Integration

### Automatic Deployment

Most platforms support automatic deployment from GitHub:

1. **Railway/Render**: Auto-deploy on push to main branch
2. **Fly.io**: Use GitHub Actions
3. **AWS ECS**: Use CodePipeline or GitHub Actions

### GitHub Actions Example (Fly.io)

```yaml
name: Deploy Worker to Fly

on:
  push:
    branches: [main]
    paths:
      - 'src/infrastructure/bullmq/**'
      - 'Dockerfile.worker'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Next Steps

1. ✅ Choose a deployment platform (Railway recommended for getting started)
2. ✅ Set up account and connect GitHub repository
3. ✅ Configure environment variables
4. ✅ Deploy worker
5. ✅ Monitor logs and verify job processing
6. ✅ Test end-to-end evaluation flow
7. ✅ Set up alerts and monitoring
8. ✅ Configure auto-scaling (optional)

## Support

If you encounter issues:
- Check platform-specific documentation
- Review worker logs for errors
- Verify environment variables
- Test Redis/Supabase connectivity
- Check Sentry for exception details

## Additional Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
- [Fly.io Documentation](https://fly.io/docs/)
- [Upstash Redis](https://docs.upstash.com/redis)
