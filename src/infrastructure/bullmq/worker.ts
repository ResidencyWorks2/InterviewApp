import * as Sentry from "@sentry/nextjs";
import { type Job, Worker } from "bullmq";
import type {
	EvaluationRequest,
	EvaluationResult,
} from "../../domain/evaluation/ai-evaluation-schema";
import { EvaluationResultSchema } from "../../domain/evaluation/ai-evaluation-schema";
import { logger } from "../logging/logger";
import { evaluateTranscript } from "../openai/gpt_evaluator";
import { transcribeAudio } from "../openai/whisper";
import { captureEvent } from "../posthog";
import { getByRequestId, upsertResult } from "../supabase/evaluation_store";
import { connection, EVALUATION_QUEUE_NAME } from "./queue";

type ScopeLike = { setTag?: (key: string, value: string) => void };
type FlushableClient = { flush?: (timeout?: number) => PromiseLike<void> };
type ExtendedSentry = typeof Sentry & {
	configureScope?: (callback: (scope: ScopeLike) => void) => void;
	flush?: (timeout?: number) => PromiseLike<void>;
	getCurrentHub?: () =>
		| {
				getClient?: () => FlushableClient | undefined;
		  }
		| undefined;
};

const sentryExtended = Sentry as ExtendedSentry;
const sentryEnabled = Boolean(process.env.SENTRY_DSN);

// Determine whether a client is installed
const _sentryClient = sentryExtended.getCurrentHub?.()?.getClient?.();

if (sentryEnabled && !_sentryClient) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		environment:
			process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? "development",
		release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
		tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),
	});
	sentryExtended.configureScope?.((scope) =>
		scope.setTag?.("component", "evaluation-worker"),
	);
	logger.info("Sentry initialized for evaluation worker", {
		component: "evaluation-worker",
		action: "sentry-init",
	});
} else if (!sentryEnabled) {
	logger.warn("Sentry disabled: SENTRY_DSN not provided in environment", {
		component: "evaluation-worker",
		action: "sentry-init",
	});
}

const flushSentry = async () => {
	if (!sentryEnabled) return;
	try {
		// Prefer flushing via the installed client if available, otherwise fall back
		// to any top-level flush function. Guard both to avoid runtime errors
		// with different Sentry package shapes in worker environments.
		const client = sentryExtended.getCurrentHub?.()?.getClient?.();
		const clientFlush = client?.flush;
		if (typeof clientFlush === "function") {
			await clientFlush(2000);
		} else if (typeof sentryExtended.flush === "function") {
			await sentryExtended.flush(2000);
		}
	} catch (flushError) {
		const error =
			flushError instanceof Error ? flushError : new Error(String(flushError));
		logger.error("Failed to flush Sentry events", error, {
			component: "evaluation-worker",
			action: "sentry-flush",
		});
	}
};

["SIGTERM", "SIGINT"].forEach((signal) => {
	process.on(signal, async () => {
		logger.info(`Received ${signal}, shutting down gracefully`, {
			component: "evaluation-worker",
			action: "shutdown",
			metadata: { signal },
		});
		await flushSentry();
		process.exit(0);
	});
});

/**
 * BullMQ worker that processes evaluation jobs.
 * Handles transcription (if audio_url provided), GPT evaluation, validation, persistence, and analytics.
 */
export const evaluationWorker = new Worker<EvaluationRequest>(
	EVALUATION_QUEUE_NAME,
	async (job: Job<EvaluationRequest>) => {
		const startTime = Date.now();
		const { requestId, text, audio_url, userId, metadata } = job.data;

		logger.info("Processing evaluation job", {
			component: "evaluation-worker",
			action: "process-job",
			requestId,
			metadata: {
				jobId: job.id,
				hasText: !!text,
				hasAudio: !!audio_url,
			},
		});

		try {
			// T022: Idempotency guard - check if already processed
			const existingResult = await getByRequestId(requestId);
			if (existingResult) {
				logger.info("Request already processed, returning cached result", {
					component: "evaluation-worker",
					action: "idempotency-check",
					requestId,
					metadata: { jobId: job.id },
				});

				// Emit events with cached data
				captureEvent("job_completed", {
					jobId: job.id,
					requestId,
					durationMs: existingResult.durationMs,
					tokensUsed: existingResult.tokensUsed ?? null,
					cached: true,
				});

				captureEvent("score_returned", {
					requestId,
					score: existingResult.score,
					cached: true,
				});

				return existingResult;
			}

			let transcript = text || "";
			let transcriptionDurationMs = 0;

			// T018: Transcribe audio if provided
			if (audio_url && !text) {
				logger.info("Transcribing audio", {
					component: "evaluation-worker",
					action: "transcribe-audio",
					requestId,
					metadata: { audioUrl: audio_url },
				});
				const transcriptionResult = await transcribeAudio(audio_url);
				transcript = transcriptionResult.transcript;
				transcriptionDurationMs = transcriptionResult.durationMs;
				logger.info("Transcription completed", {
					component: "evaluation-worker",
					action: "transcribe-audio",
					requestId,
					metadata: { durationMs: transcriptionDurationMs },
				});
			}

			// Validate transcript exists
			if (!transcript) {
				throw new Error("No transcript available for evaluation");
			}

			// T019: Evaluate with GPT-4
			logger.info("Evaluating transcript", {
				component: "evaluation-worker",
				action: "evaluate-transcript",
				requestId,
				metadata: { transcriptLength: transcript.length },
			});
			const evaluation = await evaluateTranscript(transcript);
			logger.info("Evaluation completed", {
				component: "evaluation-worker",
				action: "evaluate-transcript",
				requestId,
				metadata: {
					score: evaluation.score,
					tokensUsed: evaluation.tokensUsed ?? null,
				},
			});

			// Calculate total duration
			const durationMs = Date.now() - startTime;

			// Build result object
			const result: EvaluationResult = {
				requestId,
				jobId: job.id ?? requestId,
				score: evaluation.score,
				feedback: evaluation.feedback,
				what_changed: evaluation.what_changed,
				practice_rule: evaluation.practice_rule,
				durationMs,
				tokensUsed: evaluation.tokensUsed,
				transcription: audio_url ? transcript : undefined,
			};

			// Validate result against schema
			EvaluationResultSchema.parse(result);

			// Persist to database
			await upsertResult(result, userId ?? null, metadata);
			logger.info("Result persisted to database", {
				component: "evaluation-worker",
				action: "persist-result",
				requestId,
				userId: userId ?? undefined,
			});

			// Emit analytics events
			captureEvent("job_completed", {
				jobId: job.id,
				requestId,
				durationMs,
				transcriptionDurationMs,
				tokensUsed: result.tokensUsed ?? null,
				hadAudio: !!audio_url,
				cached: false,
			});

			captureEvent("score_returned", {
				requestId,
				score: result.score,
				cached: false,
			});

			logger.info("Job completed successfully", {
				component: "evaluation-worker",
				action: "job-completed",
				requestId,
				metadata: {
					jobId: job.id,
					durationMs: Date.now() - startTime,
				},
			});
			return result;
		} catch (error) {
			const durationMs = Date.now() - startTime;
			const errorObj =
				error instanceof Error ? error : new Error(String(error));
			logger.error("Job failed", errorObj, {
				component: "evaluation-worker",
				action: "job-failed",
				requestId,
				metadata: {
					jobId: job.id,
					durationMs,
				},
			});

			// Capture error in Sentry
			Sentry.captureException(error, {
				contexts: {
					job: {
						jobId: job.id,
						requestId,
						durationMs,
						hasAudio: !!job.data.audio_url,
						hasText: !!job.data.text,
					},
				},
				tags: {
					component: "evaluation-worker",
					jobId: job.id,
				},
			});

			// Emit failure event
			captureEvent("job_failed", {
				jobId: job.id,
				requestId,
				durationMs,
				error: error instanceof Error ? error.message : String(error),
			});

			throw error;
		}
	},
	{
		connection,
		concurrency: 1, // Process one job at a time for simplicity
	},
);

// Handle worker events
evaluationWorker.on("completed", (job) => {
	logger.info("Worker event: job completed", {
		component: "evaluation-worker",
		action: "worker-event",
		metadata: { jobId: job.id },
	});
});

evaluationWorker.on("failed", (job, err) => {
	const error = err instanceof Error ? err : new Error(String(err));
	logger.error("Worker event: job failed", error, {
		component: "evaluation-worker",
		action: "worker-event",
		metadata: { jobId: job?.id },
	});
});

evaluationWorker.on("error", (err) => {
	const error = err instanceof Error ? err : new Error(String(err));
	logger.error("Worker error", error, {
		component: "evaluation-worker",
		action: "worker-error",
	});
});

logger.info("Evaluation worker started", {
	component: "evaluation-worker",
	action: "worker-start",
	metadata: { queueName: EVALUATION_QUEUE_NAME },
});
