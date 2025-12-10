import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/environment";

// BullMQ requires a native Redis protocol connection (TCP, not HTTP REST)
// Support multiple Redis providers:
// 1. Railway Redis: Uses REDIS_URL (native connection string)
// 2. Upstash Redis: Uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// 3. Upstash Native: Uses UPSTASH_REDIS_NATIVE_URL (native connection string)

let connection: IORedis;

if (env.REDIS_URL) {
	// Railway Redis or other Redis with native connection string
	// REDIS_URL format: redis://:password@host:port or rediss://:password@host:port
	connection = new IORedis(env.REDIS_URL, {
		maxRetriesPerRequest: null, // Required by BullMQ
		enableReadyCheck: false,
	});
} else if (env.UPSTASH_REDIS_NATIVE_URL) {
	// Upstash native Redis connection string
	// Format: rediss://default:YOUR_PASSWORD@equipped-chow-27101.upstash.io:6379
	connection = new IORedis(env.UPSTASH_REDIS_NATIVE_URL, {
		maxRetriesPerRequest: null, // Required by BullMQ
		enableReadyCheck: false,
	});
} else if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
	// Upstash REST API - extract host and use token as password
	// Extract host from REST URL (e.g., https://equipped-chow-27101.upstash.io -> equipped-chow-27101.upstash.io)
	const restUrl = new URL(env.UPSTASH_REDIS_REST_URL);
	connection = new IORedis({
		host: restUrl.hostname,
		port: 6379,
		password: env.UPSTASH_REDIS_REST_TOKEN,
		tls: {},
		maxRetriesPerRequest: null, // Required by BullMQ
		enableReadyCheck: false,
	});
} else {
	throw new Error(
		"Redis connection not configured. Set one of:\n" +
			"- REDIS_URL (for Railway Redis or any Redis with native connection string)\n" +
			"- UPSTASH_REDIS_NATIVE_URL (for Upstash native connection)\n" +
			"- UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (for Upstash REST API)",
	);
}

export { connection };

export const EVALUATION_QUEUE_NAME = "evaluationQueue";

export const evaluationQueue = new Queue(EVALUATION_QUEUE_NAME, {
	connection,
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
