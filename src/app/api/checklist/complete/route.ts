import type { NextRequest } from "next/server";
import { z } from "zod";
import { PostHogAnalyticsService } from "@/features/notifications/infrastructure/posthog/AnalyticsService";
import {
	createPostHogConfig,
	toAnalyticsServiceConfig,
} from "@/infrastructure/posthog/client";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createRateLimitResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

const CompleteChecklistSchema = z.object({
	evaluation_id: z.string().uuid(),
	template_id: z.string().uuid(),
	completed: z.boolean(),
});

// In-memory rate limit store (per user, per minute)
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_MAX = 10; // 10 requests per minute per user
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Check rate limit for a user
 * @param userId - User ID
 * @returns Rate limit status and response if exceeded
 */
function checkRateLimit(userId: string): {
	allowed: boolean;
	response?: ReturnType<typeof createRateLimitResponse>;
	remaining: number;
	resetTime: number;
} {
	const now = Date.now();
	const key = `checklist_complete:${userId}`;
	const current = rateLimitStore.get(key);

	// Clean up expired entries
	if (current && current.resetTime < now) {
		rateLimitStore.delete(key);
	}

	const entry = rateLimitStore.get(key);

	if (!entry) {
		// First request - initialize
		const resetTime = now + RATE_LIMIT_WINDOW_MS;
		rateLimitStore.set(key, { count: 1, resetTime });
		return {
			allowed: true,
			remaining: RATE_LIMIT_MAX - 1,
			resetTime,
		};
	}

	if (entry.count >= RATE_LIMIT_MAX) {
		// Rate limit exceeded
		const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
		return {
			allowed: false,
			response: createRateLimitResponse(
				retryAfter,
				RATE_LIMIT_MAX,
				0,
				entry.resetTime,
			),
			remaining: 0,
			resetTime: entry.resetTime,
		};
	}

	// Increment count
	entry.count++;
	return {
		allowed: true,
		remaining: RATE_LIMIT_MAX - entry.count,
		resetTime: entry.resetTime,
	};
}

/**
 * POST /api/checklist/complete
 *
 * Toggles completion status of a checklist item for a user's evaluation.
 * Implements rate limiting (10 requests per minute per user) to prevent abuse.
 * Tracks analytics event `checklist_completed` when an item is marked as completed.
 *
 * @param request - Next.js request object
 * @param request.body.evaluation_id - UUID of the evaluation result
 * @param request.body.template_id - UUID of the checklist template item
 * @param request.body.completed - Boolean indicating whether item should be marked as completed
 * @returns Success response with completion status, or error/rate limit response
 * @throws {Error} If authentication fails, validation error, rate limit exceeded, or database error
 *
 * @example
 * POST /api/checklist/complete
 * Body: { "evaluation_id": "123e4567-...", "template_id": "abc123-...", "completed": true }
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			// Check if error indicates session expiration
			const isExpired =
				authError?.message?.includes("expired") ||
				authError?.message?.includes("invalid") ||
				authError?.status === 401;
			const message = isExpired
				? "Your session has expired. Please sign in again."
				: "Authentication required";
			return createUnauthorizedResponse(message);
		}

		const json = await request.json();
		const parsed = CompleteChecklistSchema.safeParse(json);

		if (!parsed.success) {
			return createErrorResponse(
				"Invalid request payload",
				"VALIDATION_ERROR",
				422,
			);
		}

		const { evaluation_id, template_id, completed } = parsed.data;

		// Check rate limit (10 requests per minute per user)
		const rateLimit = checkRateLimit(user.id);
		if (!rateLimit.allowed && rateLimit.response) {
			return rateLimit.response;
		}

		if (completed) {
			// Add completion record
			const { data, error } = await supabase
				.from("checklist_completions")
				.upsert(
					{
						user_id: user.id,
						evaluation_id,
						template_id,
					},
					{
						onConflict: "user_id,evaluation_id,template_id",
					},
				)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to save completion: ${error.message}`);
			}

			// Fetch template to get category for analytics
			const { data: template } = await supabase
				.from("checklist_templates")
				.select("category")
				.eq("id", template_id)
				.single();

			// Track checklist_completed analytics event when item is completed
			try {
				const postHogConfig = createPostHogConfig();
				const analyticsConfig = toAnalyticsServiceConfig(postHogConfig);
				const analyticsService = new PostHogAnalyticsService(analyticsConfig);
				await analyticsService.track(
					"checklist_completed",
					{
						evaluation_id,
						template_id,
						category: template?.category || "unknown",
					},
					user.id,
				);
			} catch (analyticsError) {
				// Don't fail the request if analytics fails
				console.error(
					"Failed to track checklist_completed event:",
					analyticsError,
				);
			}

			return createSuccessResponse({
				completed: true,
				completion: data,
			});
		} else {
			// Remove completion record
			const { error } = await supabase
				.from("checklist_completions")
				.delete()
				.eq("user_id", user.id)
				.eq("evaluation_id", evaluation_id)
				.eq("template_id", template_id);

			if (error) {
				throw new Error(`Failed to remove completion: ${error.message}`);
			}

			return createSuccessResponse({
				completed: false,
			});
		}
	} catch (error) {
		console.error("Error in checklist complete:", error);
		return createErrorResponse(
			"Failed to update checklist",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
