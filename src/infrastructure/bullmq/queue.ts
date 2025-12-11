import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/environment";

// BullMQ requires a native Redis protocol connection (TCP, not HTTP REST)
// Upstash provides BOTH connection types:
// 1. REST API: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (for @upstash/redis)
// 2. Native Redis: REDIS_URL (for BullMQ/ioredis)
//
// Get your native Redis URL from Upstash Dashboard:
// - Go to https://console.upstash.com
// - Click your database
// - Find "Redis Connect" section
// - Copy the URL that starts with redis:// or rediss://
//
// Format: rediss://default:YOUR_PASSWORD@equipped-chow-27101.upstash.io:6379

export const EVALUATION_QUEUE_NAME = "evaluationQueue";

// Lazy initialization: connection and queue are created only when accessed
// This prevents build-time errors when env vars aren't available
let cachedConnection: IORedis | null = null;
let cachedQueue: Queue | null = null;

/**
 * Get or create the Redis connection for BullMQ
 * Lazy initialization to avoid requiring env vars at build time
 */
function getConnection(): IORedis {
	if (cachedConnection) {
		return cachedConnection;
	}

	// During build, env vars may not be available - check and handle gracefully
	const restUrl = env.UPSTASH_REDIS_REST_URL;
	const token = env.UPSTASH_REDIS_REST_TOKEN;

	// Check if we're in build phase
	const isBuildPhase =
		process.env.NEXT_PHASE === "phase-production-build" ||
		process.env.NEXT_PHASE === "phase-development-build" ||
		(typeof restUrl === "string" && restUrl.includes("${{"));

	if (!restUrl || !token) {
		if (isBuildPhase) {
			// During build, return a placeholder connection that will fail gracefully if used
			// This allows the build to complete
			cachedConnection = new IORedis({
				host: "placeholder.redis",
				port: 6379,
				password: "placeholder",
				lazyConnect: true, // Don't connect immediately
				maxRetriesPerRequest: null,
				enableReadyCheck: false,
			});
			return cachedConnection;
		}

		throw new Error(
			"UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set for BullMQ to work.",
		);
	}

	// Extract host from REST URL (e.g., https://equipped-chow-27101.upstash.io -> equipped-chow-27101.upstash.io)
	const url = new URL(restUrl);

	cachedConnection = new IORedis({
		host: url.hostname,
		port: 6379,
		password: token,
		tls: {},
		maxRetriesPerRequest: null, // Required by BullMQ
		enableReadyCheck: false,
	});

	return cachedConnection;
}

/**
 * Get or create the evaluation queue
 * Lazy initialization to avoid requiring env vars at build time
 */
export function getEvaluationQueue(): Queue {
	if (cachedQueue) {
		return cachedQueue;
	}

	cachedQueue = new Queue(EVALUATION_QUEUE_NAME, {
		connection: getConnection(),
		defaultJobOptions: {
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 1000, // 1s, 2s, 4s
			},
			removeOnComplete: 100, // Keep last 100 completed
			removeOnFail: 1000, // Keep last 1000 failed
		},
	});

	return cachedQueue;
}

// Export connection for worker usage (lazy getter)
export const connection = new Proxy({} as IORedis, {
	get(_target, prop) {
		return getConnection()[prop as keyof IORedis];
	},
});

// Export queue for backward compatibility (lazy getter)
// Use getEvaluationQueue() for explicit lazy access
export const evaluationQueue = new Proxy({} as Queue, {
	get(_target, prop) {
		return getEvaluationQueue()[prop as keyof Queue];
	},
});
