import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/environment";

// BullMQ requires a native Redis protocol connection (TCP, not HTTP REST)
// Upstash provides BOTH connection types:
// 1. REST API: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (for @upstash/redis)
// 2. Native Redis: REDIS_URL or UPSTASH_REDIS_NATIVE_URL (for BullMQ/ioredis)
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
 *
 * Priority order:
 * 1. REDIS_URL (native Redis connection string)
 * 2. UPSTASH_REDIS_NATIVE_URL (Upstash native Redis URL)
 * 3. Fallback: construct from UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (not recommended)
 */
function getConnection(): IORedis {
	if (cachedConnection) {
		return cachedConnection;
	}

	// Check if we're in build phase
	const isBuildPhase =
		process.env.NEXT_PHASE === "phase-production-build" ||
		process.env.NEXT_PHASE === "phase-development-build";

	// Priority 1: Use REDIS_URL if available (native Redis connection string)
	const redisUrl = env.REDIS_URL || env.UPSTASH_REDIS_NATIVE_URL;

	if (redisUrl) {
		// Check if it's a placeholder during build
		if (
			isBuildPhase &&
			typeof redisUrl === "string" &&
			redisUrl.includes("${{")
		) {
			// During build, return a placeholder connection
			cachedConnection = new IORedis({
				host: "placeholder.redis",
				port: 6379,
				password: "placeholder",
				lazyConnect: true,
				maxRetriesPerRequest: null,
				enableReadyCheck: false,
			});
			return cachedConnection;
		}

		// Use the native Redis URL directly
		cachedConnection = new IORedis(redisUrl, {
			maxRetriesPerRequest: null, // Required by BullMQ
			enableReadyCheck: false,
			lazyConnect: true, // Don't connect immediately - let BullMQ handle connection
			retryStrategy: (times) => {
				// Exponential backoff with max delay of 30s
				const delay = Math.min(times * 200, 30000);
				console.log(
					`[queue] Redis connection retry attempt ${times}, waiting ${delay}ms`,
				);
				return delay;
			},
		});

		// Set up error handlers
		cachedConnection.on("error", (err) => {
			console.error("[queue] Redis connection error:", err);
		});

		cachedConnection.on("connect", () => {
			console.log("[queue] Redis connection established");
		});

		cachedConnection.on("ready", () => {
			console.log("[queue] Redis connection ready");
		});

		return cachedConnection;
	}

	// Priority 2: Fallback to constructing from REST API credentials (not recommended)
	// This is a workaround but may not work correctly for all Upstash configurations
	const restUrl = env.UPSTASH_REDIS_REST_URL;
	const token = env.UPSTASH_REDIS_REST_TOKEN;

	if (!restUrl || !token) {
		if (isBuildPhase) {
			// During build, return a placeholder connection that will fail gracefully if used
			cachedConnection = new IORedis({
				host: "placeholder.redis",
				port: 6379,
				password: "placeholder",
				lazyConnect: true,
				maxRetriesPerRequest: null,
				enableReadyCheck: false,
			});
			return cachedConnection;
		}

		throw new Error(
			"Redis connection required for BullMQ. Please set REDIS_URL, UPSTASH_REDIS_NATIVE_URL, or both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
		);
	}

	// Extract host from REST URL (e.g., https://equipped-chow-27101.upstash.io -> equipped-chow-27101.upstash.io)
	// This is a fallback and may not work for all Upstash configurations
	const url = new URL(restUrl);

	cachedConnection = new IORedis({
		host: url.hostname,
		port: 6379,
		password: token,
		tls: {},
		maxRetriesPerRequest: null, // Required by BullMQ
		enableReadyCheck: false,
		lazyConnect: true, // Don't connect immediately - let BullMQ handle connection
		retryStrategy: (times) => {
			// Exponential backoff with max delay of 30s
			const delay = Math.min(times * 200, 30000);
			console.log(
				`[queue] Redis connection retry attempt ${times}, waiting ${delay}ms`,
			);
			return delay;
		},
	});

	// Set up error handlers
	cachedConnection.on("error", (err) => {
		console.error("[queue] Redis connection error:", err);
	});

	cachedConnection.on("connect", () => {
		console.log("[queue] Redis connection established");
	});

	cachedConnection.on("ready", () => {
		console.log("[queue] Redis connection ready");
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

/**
 * Get the Redis connection for BullMQ worker
 * This is a getter function that ensures the connection is properly initialized
 * Use this in the worker instead of the Proxy export
 */
export function getConnectionForWorker(): IORedis {
	return getConnection();
}

// Export connection for worker usage (lazy getter via Proxy)
// BullMQ Worker constructor accepts a connection object
// The Proxy ensures lazy initialization while maintaining compatibility
// However, we need to ensure all methods are properly forwarded
export const connection = new Proxy({} as IORedis, {
	get(_target, prop) {
		const conn = getConnection();
		const value = conn[prop as keyof IORedis];
		// If it's a function, bind it to the connection instance
		if (typeof value === "function") {
			return value.bind(conn);
		}
		return value;
	},
	// Forward property checks
	has(_target, prop) {
		return prop in getConnection();
	},
	// Forward own property keys
	ownKeys(_target) {
		return Reflect.ownKeys(getConnection());
	},
	// Forward property descriptor
	getOwnPropertyDescriptor(_target, prop) {
		return Reflect.getOwnPropertyDescriptor(getConnection(), prop);
	},
});

// Export queue for backward compatibility (lazy getter)
// Use getEvaluationQueue() for explicit lazy access
export const evaluationQueue = new Proxy({} as Queue, {
	get(_target, prop) {
		return getEvaluationQueue()[prop as keyof Queue];
	},
});
