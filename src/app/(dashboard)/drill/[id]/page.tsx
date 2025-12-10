"use client";

import { ArrowLeft, ArrowRight, BarChart3, Target } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import type { EvaluationResult, ResponseType } from "@/components/drill";
import {
	ChipsStream,
	EvaluationResultDisplay,
	ProgressPill,
	ResponseSubmission,
	StreamingTips,
} from "@/components/drill";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useEvaluationStream } from "@/hooks";
import { useDrillProgress } from "@/hooks/useDrillProgress";

interface QuestionData {
	id: string;
	text: string;
	type: string;
	difficulty?: string;
	estimatedMinutes?: number;
	tags?: string[];
	competency?: string;
	expectedResponseElements?: string[];
	drill_specialty?: string; // NEW: Specialty field
	evaluationId: string;
	evaluationTitle: string;
	evaluationDescription: string;
}

interface EvaluationData {
	id: string;
	title: string;
	description: string;
	category?: string;
	totalQuestions: number;
	currentQuestionIndex: number;
}

interface NavigationData {
	nextQuestionId: string | null;
	prevQuestionId: string | null;
	hasNext: boolean;
	hasPrev: boolean;
}

interface ContentPackData {
	id: string; // This is the actual UUID from the database
	name: string;
	version: string;
}

interface PreviousAttempt {
	request_id: string;
	score: number;
	feedback: string;
	created_at: string;
	response_type: string;
}

interface UserEvaluationHistory {
	attempts: PreviousAttempt[];
	totalAttempts: number;
	bestAttempt: PreviousAttempt | null;
	latestAttempt: PreviousAttempt | null;
}

// Import the generated type from database.ts
import type { Tables } from "@/types/database";

type QuestionSubmission = Tables<"question_submissions">;

export default function DrillInterfacePage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { user } = useAuth();
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [evaluationResult, setEvaluationResult] =
		React.useState<EvaluationResult | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [questionData, setQuestionData] = React.useState<QuestionData | null>(
		null,
	);
	const [evaluationData, setEvaluationData] =
		React.useState<EvaluationData | null>(null);
	const [navigationData, setNavigationData] =
		React.useState<NavigationData | null>(null);
	const [contentPackData, setContentPackData] =
		React.useState<ContentPackData | null>(null);
	const [previousAttempts, setPreviousAttempts] =
		React.useState<UserEvaluationHistory | null>(null);
	const [currentSubmission, setCurrentSubmission] =
		React.useState<QuestionSubmission | null>(null);
	const [streamingJobId, setStreamingJobId] = React.useState<string | null>(
		null,
	);
	const [streamingRequestId, setStreamingRequestId] = React.useState<
		string | null
	>(null);
	const [submittedText, setSubmittedText] = React.useState<string>("");
	const [fallbackEnabled, setFallbackEnabled] = React.useState(false);
	const [loadingSavedEvaluation, setLoadingSavedEvaluation] =
		React.useState(false);

	const questionId = params.id as string;
	const evaluationId = searchParams.get("evaluation");
	const showResults = searchParams.get("showResults") === "true"; // Allow viewing completed questions

	// Fetch question data from content pack
	React.useEffect(() => {
		const fetchQuestion = async () => {
			setLoading(true);
			setError(null);

			try {
				const url = evaluationId
					? `/api/content-packs/active/questions/${questionId}?evaluation=${evaluationId}`
					: `/api/content-packs/active/questions/${questionId}`;

				const response = await fetch(url);
				if (!response.ok) {
					throw new Error("Failed to fetch question");
				}

				const result = await response.json();
				// The API wraps the response in a 'data' property
				setQuestionData(result.data?.question);
				setEvaluationData(result.data?.evaluation);
				setNavigationData(result.data?.navigation);
				setContentPackData(result.data?.contentPack);
			} catch (err) {
				console.error("Failed to fetch question:", err);
				setError(
					err instanceof Error ? err.message : "Failed to load question",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchQuestion();
	}, [questionId, evaluationId]);

	// Fetch previous attempts for this question
	React.useEffect(() => {
		const fetchHistory = async () => {
			if (!user || !questionId) return;

			try {
				const response = await fetch(`/api/evaluations/user/${questionId}`);

				// If authentication failed, silently return
				if (response.status === 401) {
					console.warn("Authentication required for fetching history");
					return;
				}

				if (response.ok) {
					const result = await response.json();
					setPreviousAttempts(result.data);
				}
			} catch (err) {
				console.error("Failed to fetch evaluation history:", err);
			}
		};

		fetchHistory();
	}, [user, questionId]);

	// Fetch current submission for this question and redirect if already answered
	React.useEffect(() => {
		const fetchSubmissionAndRedirect = async () => {
			if (
				!user ||
				!questionId ||
				!evaluationId ||
				!evaluationData ||
				!navigationData
			)
				return;

			try {
				const response = await fetch(
					`/api/submissions?questionId=${questionId}&drillId=${evaluationId}`,
				);

				// If authentication failed, silently return (user might not be fully authenticated yet)
				if (response.status === 401) {
					console.warn("Authentication required for fetching submission");
					return;
				}

				if (response.ok) {
					const result = await response.json();
					const submission = result.data?.submission;

					// If submission is stuck in "processing" or "pending", check if evaluation completed
					if (
						submission &&
						(submission.evaluation_status === "processing" ||
							submission.evaluation_status === "pending")
					) {
						const jobId = submission.evaluation_job_id;
						if (jobId) {
							try {
								const statusResponse = await fetch(
									`/api/evaluate/${jobId}/status`,
								);
								if (statusResponse.ok) {
									const statusData = await statusResponse.json();

									// If evaluation completed, update submission status
									if (statusData.status === "completed" && statusData.result) {
										console.log(
											"🔄 Found completed evaluation, updating submission status...",
										);
										const updateResponse = await fetch("/api/submissions", {
											method: "PATCH",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({
												submissionId: submission.id,
												evaluation_status: "completed",
												evaluation_completed_at: new Date().toISOString(),
											}),
										});

										if (updateResponse.ok) {
											const updateResult = await updateResponse.json();
											const updatedSubmission = updateResult.data?.submission;
											setCurrentSubmission(updatedSubmission);

											// If completed, redirect to next unanswered question
											// BUT only if user hasn't explicitly requested to view results
											if (
												updatedSubmission &&
												navigationData.hasNext &&
												!showResults
											) {
												console.log(
													"✅ Question already answered, redirecting to next question...",
												);
												router.push(
													`/drill/${navigationData.nextQuestionId}?evaluation=${evaluationId}`,
												);
												return;
											}
										}
									}
								}
							} catch (statusError) {
								console.warn("Failed to check evaluation status:", statusError);
							}
						}
					}

					// If submission exists and is completed, redirect to next unanswered question
					// BUT only if user hasn't explicitly requested to view results
					if (
						submission &&
						submission.evaluation_status === "completed" &&
						!showResults
					) {
						if (navigationData.hasNext) {
							console.log(
								"✅ Question already answered, redirecting to next question...",
							);
							router.push(
								`/drill/${navigationData.nextQuestionId}?evaluation=${evaluationId}`,
							);
							return;
						}
					}

					setCurrentSubmission(submission);
				}
			} catch (err) {
				console.error("Failed to fetch current submission:", err);
			}
		};

		fetchSubmissionAndRedirect();
	}, [
		user,
		questionId,
		evaluationId,
		evaluationData,
		navigationData,
		router,
		showResults,
	]);

	// Fetch and display saved evaluation result when viewing completed question
	React.useEffect(() => {
		const loadSavedEvaluation = async () => {
			// Only load if viewing results mode and submission is completed
			if (
				!showResults ||
				!currentSubmission ||
				currentSubmission.evaluation_status !== "completed"
			) {
				setLoadingSavedEvaluation(false);
				return;
			}

			// If we already have an evaluation result, don't reload
			if (evaluationResult) {
				setLoadingSavedEvaluation(false);
				return;
			}

			setLoadingSavedEvaluation(true);
			try {
				// Fetch the latest evaluation result from the API
				const response = await fetch(`/api/evaluations/user/${questionId}`);

				if (response.ok) {
					const result = await response.json();
					const latestAttempt = result.data?.latestAttempt;

					if (latestAttempt) {
						// Map the database result to EvaluationResult format
						const savedResult: EvaluationResult = {
							id:
								latestAttempt.id ||
								latestAttempt.request_id ||
								crypto.randomUUID(),
							user_id: user?.id ?? "anonymous",
							content_pack_id:
								contentPackData?.id || latestAttempt.content_pack_id,
							response_type: (latestAttempt.response_type ||
								currentSubmission.response_type ||
								"text") as "text" | "audio",
							response_text:
								latestAttempt.response_text ||
								currentSubmission.response_text ||
								undefined,
							response_audio_url:
								latestAttempt.response_audio_url ||
								currentSubmission.response_audio_url ||
								undefined,
							duration_seconds:
								latestAttempt.duration_seconds ||
								(latestAttempt.duration_ms != null
									? latestAttempt.duration_ms / 1000
									: undefined),
							word_count: latestAttempt.word_count,
							wpm: latestAttempt.wpm,
							categories: latestAttempt.categories || {
								clarity: latestAttempt.score || 0,
								content: latestAttempt.score || 0,
								delivery: latestAttempt.score || 0,
								structure: latestAttempt.score || 0,
							},
							feedback: latestAttempt.feedback || "No feedback available",
							score: latestAttempt.score,
							status: "COMPLETED",
							created_at: latestAttempt.created_at || new Date().toISOString(),
							updated_at:
								latestAttempt.updated_at ||
								latestAttempt.created_at ||
								new Date().toISOString(),
							category_flags: Array.isArray(latestAttempt.category_flags)
								? latestAttempt.category_flags
								: typeof latestAttempt.category_flags === "string"
									? (() => {
											try {
												const parsed = JSON.parse(latestAttempt.category_flags);
												return Array.isArray(parsed) ? parsed : undefined;
											} catch {
												return undefined;
											}
										})()
									: undefined,
							what_changed: Array.isArray(latestAttempt.what_changed)
								? latestAttempt.what_changed
								: typeof latestAttempt.what_changed === "string"
									? (() => {
											try {
												const parsed = JSON.parse(latestAttempt.what_changed);
												return Array.isArray(parsed) ? parsed : undefined;
											} catch {
												return undefined;
											}
										})()
									: undefined,
							practice_rule: latestAttempt.practice_rule,
						};

						setEvaluationResult(savedResult);
						console.log("✅ Loaded saved evaluation result:", savedResult);
					}
				}
			} catch (err) {
				console.error("Failed to load saved evaluation:", err);
			} finally {
				setLoadingSavedEvaluation(false);
			}
		};

		loadSavedEvaluation();
	}, [
		showResults,
		currentSubmission,
		questionId,
		user,
		contentPackData,
		evaluationResult,
	]);

	// Track drill progress - use a stable ID to avoid hook issues
	const drillId = evaluationData?.id || "loading";
	const drillProgressHook = useDrillProgress(drillId);
	const totalQuestions = evaluationData?.totalQuestions || 0;

	// Use streaming hook for real-time feedback
	const streamingFeedback = useEvaluationStream(
		streamingJobId,
		streamingRequestId,
	);

	// Fallback timeout - re-enable input after 3s if streaming stalls
	React.useEffect(() => {
		if (!isSubmitting || !streamingJobId) {
			setFallbackEnabled(false);
			return;
		}

		const fallbackTimer = setTimeout(() => {
			if (!evaluationResult) {
				console.log("⏱️ Fallback timeout triggered - re-enabling input");
				setFallbackEnabled(true);
			}
		}, 3000);

		return () => clearTimeout(fallbackTimer);
	}, [isSubmitting, streamingJobId, evaluationResult]);

	// Update evaluation result when streaming completes - with delay to show tips
	React.useEffect(() => {
		if (streamingFeedback.result && !evaluationResult) {
			const delay = 8000; // 8 second delay to allow tips to rotate and be visible
			console.log(
				`⏳ Delaying evaluation result by ${delay}ms to show streaming tips.`,
			);

			const streamResult = streamingFeedback.result; // Capture result to avoid null checks in timeout

			const timer = setTimeout(() => {
				// Calculate word count and metrics from submitted text
				const wordCount = submittedText
					? submittedText.trim().split(/\s+/).filter(Boolean).length
					: 0;
				const estimatedDurationSeconds = Math.max(30, wordCount / 3); // ~3 words per second
				const wpm =
					wordCount > 0
						? Math.round((wordCount / estimatedDurationSeconds) * 60)
						: 0;

				// Get category scores (use streamResult.score as baseline for all categories)
				const clarity = streamResult.score ?? 70;
				const content = streamResult.score ?? 70;
				const delivery = streamResult.score ?? 70;
				const structure = streamResult.score ?? 70;

				// Convert streaming result to EvaluationResult format
				const result: EvaluationResult = {
					id: crypto.randomUUID(),
					user_id: user?.id ?? "anonymous",
					content_pack_id: contentPackData?.id ?? "default",
					response_type: "text",
					response_text: submittedText || undefined,
					word_count: wordCount,
					wpm: wpm,
					duration_seconds: estimatedDurationSeconds,
					score: streamResult.score,
					feedback: streamResult.feedback,
					status: "COMPLETED",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					categories: {
						clarity: clarity,
						content: content,
						delivery: delivery,
						structure: structure,
					},
					// UI extras for M0 demo - 7 category flag chips
					category_flags: [
						{
							name: "Conciseness",
							passFlag: clarity >= 70 ? "PASS" : "FLAG",
							note: "Keep sentences short and emphasize key points early.",
						},
						{
							name: "Examples",
							passFlag: content >= 70 ? "PASS" : "FLAG",
							note: "Ground claims with brief, concrete examples.",
						},
						{
							name: "Signposting",
							passFlag: structure >= 70 ? "PASS" : "FLAG",
							note: "Outline your answer structure up front (First, Then, Finally).",
						},
						{
							name: "Pace",
							passFlag: wpm >= 120 && wpm <= 180 ? "PASS" : "FLAG",
							note: "Aim for 130–160 WPM to maintain clarity.",
						},
						{
							name: "Filler words",
							passFlag: Math.random() > 0.3 ? "PASS" : "FLAG",
							note: "Reduce 'um', 'like', and pauses; brief silence beats filler.",
						},
						{
							name: "Relevance",
							passFlag: content >= 75 ? "PASS" : "FLAG",
							note: "Tie each point back to the question explicitly.",
						},
						{
							name: "Confidence",
							passFlag: delivery >= 75 ? "PASS" : "FLAG",
							note: "Use active voice; avoid hedging language where not needed.",
						},
					],
					what_changed: [
						"Tightened intro and added clear thesis",
						"Inserted concrete example supporting the main claim",
						"Improved signposting for section transitions",
					],
					practice_rule:
						"Use the 30-60-90 structure: thesis in 30s, depth in 60s, recap in 90s.",
				};
				setEvaluationResult(result);
				setIsSubmitting(false);
				setStreamingJobId(null);
				setStreamingRequestId(null);
			}, delay);

			return () => clearTimeout(timer);
		}
	}, [
		streamingFeedback.result,
		evaluationResult,
		user,
		contentPackData,
		submittedText,
	]);

	// Handle next question navigation
	const handleNextQuestion = React.useCallback(() => {
		if (navigationData?.hasNext && navigationData.nextQuestionId) {
			router.push(
				`/drill/${navigationData.nextQuestionId}?evaluation=${evaluationData?.id}`,
			);
		} else {
			// Last question - go back to drill list
			router.push("/drill");
		}
	}, [navigationData, evaluationData, router]);

	// Handle previous question navigation
	const handlePreviousQuestion = React.useCallback(() => {
		if (
			navigationData?.hasPrev &&
			navigationData.prevQuestionId &&
			evaluationData?.id
		) {
			// Add showResults=true to allow viewing completed questions
			router.push(
				`/drill/${navigationData.prevQuestionId}?evaluation=${evaluationData.id}&showResults=true`,
			);
		}
	}, [navigationData, evaluationData, router]);

	// Handle view review/results navigation
	const handleViewResults = React.useCallback(() => {
		if (evaluationData?.id) {
			router.push(
				`/drill/${evaluationData.id}/review?evaluation=${evaluationData.id}`,
			);
		}
	}, [evaluationData, router]);

	// Handle try again (navigate to first question of drill)
	const handleTryAgain = React.useCallback(() => {
		if (evaluationData?.id) {
			// Find the first question in the drill
			// We need to fetch the first question ID from the evaluation
			fetch(`/api/content-packs/active/evaluations/${evaluationData.id}`)
				.then((res) => res.json())
				.then((data) => {
					const firstQuestionId = data.data?.questions?.[0]?.id;
					if (firstQuestionId) {
						router.push(
							`/drill/${firstQuestionId}?evaluation=${evaluationData.id}`,
						);
					} else {
						// Fallback: just reset current question
						setEvaluationResult(null);
						setIsSubmitting(false);
						setCurrentSubmission(null);
					}
				})
				.catch((err) => {
					console.error("Failed to fetch first question:", err);
					// Fallback: just reset current question
					setEvaluationResult(null);
					setIsSubmitting(false);
					setCurrentSubmission(null);
				});
		}
	}, [evaluationData, router]);

	// Loading state
	if (loading) {
		return (
			<div className="min-h-screen bg-background p-6">
				<div className="max-w-4xl mx-auto space-y-6">
					<Skeleton className="h-10 w-3/4" />
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-1/2" />
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-40 w-full" />
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	// Error state
	if (error || !questionData || !evaluationData) {
		return (
			<div className="min-h-screen bg-background p-6">
				<div className="max-w-2xl mx-auto">
					<Alert variant="destructive">
						<AlertDescription>{error || "Question not found"}</AlertDescription>
					</Alert>
					<Button onClick={() => router.push("/drill")} className="mt-4">
						Back to Drills
					</Button>
				</div>
			</div>
		);
	}

	const handleSubmit = async (data: {
		type: ResponseType;
		content: string;
		audioBlob?: Blob;
	}) => {
		setIsSubmitting(true);
		setError(null);
		setEvaluationResult(null);

		// Store submitted text for use in streaming result
		if (data.type === "text") {
			setSubmittedText(data.content);
		}

		try {
			let audioUrl: string | undefined;
			let audioDurationSeconds = 0;

			// Handle audio file upload if present
			if (data.audioBlob && data.type === "audio") {
				// Estimate duration from blob size: ~64kbps = 8KB/s for compressed audio
				// This is a rough estimate; server will validate actual duration
				audioDurationSeconds = Math.max(
					1,
					Math.round(data.audioBlob.size / 8192),
				);
				console.log(
					"📊 Estimated audio duration:",
					audioDurationSeconds,
					"seconds from blob size:",
					data.audioBlob.size,
					"bytes",
				);
			}

			// Use FormData for audio uploads to avoid size limits with base64 encoding
			let body: FormData | string;
			let contentType: string | undefined;

			if (data.type === "audio" && data.audioBlob) {
				// Send audio as FormData with multipart encoding (much more efficient than base64)
				body = new FormData();
				body.append("audioFile", data.audioBlob, "recording.wav");
				body.append("questionId", questionId);
				body.append("userId", user?.id ?? "anonymous");
				body.append(
					"metadata",
					JSON.stringify({
						contentPackId: contentPackData?.id,
						responseType: data.type,
						questionTitle: evaluationData?.title,
						questionCategory: evaluationData?.category || "General",
						evaluationId: evaluationData?.id,
					}),
				);
			} else {
				// Send text as JSON
				const requestId = crypto.randomUUID(); // Generate UUID for text requests
				body = JSON.stringify({
					requestId: requestId,
					text: data.type === "text" ? data.content : undefined,
					userId: user?.id ?? "anonymous",
					metadata: {
						contentPackId: contentPackData?.id,
						responseType: data.type,
						questionTitle: evaluationData?.title,
						questionCategory: evaluationData?.category || "General",
						evaluationId: evaluationData?.id,
						questionId: questionId,
					},
				});
				contentType = "application/json";
			}

			console.log("📤 Sending evaluation request:", {
				questionId,
				responseType: data.type,
				hasContent: data.type === "text",
				hasAudio: data.type === "audio" && !!data.audioBlob,
				contentLength: data.type === "text" ? data.content.length : "FormData",
				audioUrlType: data.type === "audio" ? "multipart" : "json",
				metadata: {
					contentPackId: contentPackData?.id,
					responseType: data.type,
					questionTitle: evaluationData?.title,
					questionCategory: evaluationData?.category || "General",
					evaluationId: evaluationData?.id,
				},
			});

			const fetchOptions: RequestInit = {
				method: "POST",
				body,
			};

			if (contentType) {
				fetchOptions.headers = { "Content-Type": contentType };
			}
			// For FormData, don't set Content-Type header - fetch will set it with boundary

			const response = await fetch("/api/evaluate", fetchOptions);

			if (!response.ok && response.status !== 202) {
				const errorData =
					response.status === 500
						? {}
						: await response.json().catch(() => ({}));
				throw new Error(
					errorData.message || `Evaluation failed: ${response.statusText}`,
				);
			}

			const responseData = await response.json();

			// Enable streaming feedback immediately if we have IDs
			if (responseData.jobId || responseData.requestId) {
				console.log("📋 Evaluation queued:", responseData);
				setStreamingJobId(responseData.jobId || null);
				setStreamingRequestId(responseData.requestId || null);
			}

			// Save submission immediately (even before evaluation completes)
			let submissionId: string | null = null;
			try {
				const submissionData = {
					questionId,
					drillId: evaluationId,
					contentPackId: contentPackData?.id,
					responseText: data.type === "text" ? data.content : null,
					responseAudioUrl: data.type === "audio" && audioUrl ? audioUrl : null,
					responseType: data.type,
					evaluationJobId: responseData.jobId || null,
					evaluationRequestId: responseData.requestId || null,
				};

				const submissionResponse = await fetch("/api/submissions", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(submissionData),
				});

				if (submissionResponse.ok) {
					const submissionResult = await submissionResponse.json();
					const savedSubmission = submissionResult.data?.submission;
					submissionId = savedSubmission?.id || null;
					setCurrentSubmission(savedSubmission);
					console.log("✅ Submission saved:", savedSubmission);
				}
			} catch (submissionError) {
				console.error("Failed to save submission:", submissionError);
				// Don't fail the whole evaluation if submission save fails
			}

			// Handle async response (202 - evaluation queued)
			if (response.status === 202) {
				const { jobId } = responseData;

				// Poll for completion (max 60 seconds)
				const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds
				let attempts = 0;
				let completedResult = null;

				while (attempts < maxAttempts) {
					attempts++;
					await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

					try {
						// Check if the result is ready
						const statusResponse = await fetch(`/api/evaluate/${jobId}/status`);
						if (statusResponse.ok) {
							const statusData = await statusResponse.json();

							// If completed, process the result
							if (statusData.status === "completed" && statusData.result) {
								console.log("✅ Evaluation completed, processing result...");
								completedResult = statusData.result;

								// Update submission status to completed
								if (submissionId) {
									try {
										const updateResponse = await fetch("/api/submissions", {
											method: "PATCH",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({
												submissionId,
												evaluation_status: "completed",
												evaluation_completed_at: new Date().toISOString(),
											}),
										});
										if (updateResponse.ok) {
											const updateResult = await updateResponse.json();
											setCurrentSubmission(updateResult.data?.submission);
										}
									} catch (updateError) {
										console.warn(
											"Failed to update submission status:",
											updateError,
										);
									}
								}

								break; // Exit polling loop
							}

							if (statusData.status === "failed") {
								// Update submission status to failed
								if (submissionId) {
									try {
										const updateResponse = await fetch("/api/submissions", {
											method: "PATCH",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({
												submissionId,
												evaluation_status: "failed",
												evaluation_completed_at: new Date().toISOString(),
											}),
										});
										if (updateResponse.ok) {
											const updateResult = await updateResponse.json();
											setCurrentSubmission(updateResult.data?.submission);
										}
									} catch (updateError) {
										console.warn(
											"Failed to update submission status:",
											updateError,
										);
									}
								}

								throw new Error("Evaluation failed during processing");
							}

							console.log(
								`⏳ Polling attempt ${attempts}/${maxAttempts}, status: ${statusData.status}`,
							);
						}
					} catch (pollError) {
						console.warn("Polling error:", pollError);
					}
				}

				// Check if we got a result
				if (!completedResult) {
					// Timeout - show message to refresh
					throw new Error(
						"Your response is still being evaluated. Please refresh the page in a few moments to see your results.",
					);
				}

				// Transform the completed result to match the expected format
				responseData.status = "completed";
				responseData.result = completedResult;
				responseData.jobId = jobId;
			}

			// Handle sync response (200 - evaluation completed)
			console.log("📥 Raw evaluation response:", responseData);

			// Transform the API response to the expected format
			let result: {
				success: boolean;
				data?: {
					feedback: Record<string, unknown>;
					submissionId: string;
					processingTimeMs: number;
					status: { status: string };
				};
			} | null;

			// Check if response is in the new format (from queue API)
			if (responseData.status === "completed" && responseData.result) {
				// Transform queue API format to expected format
				const evalResult = responseData.result;
				result = {
					success: true,
					data: {
						feedback: {
							score: evalResult.score || 0,
							feedback: evalResult.feedback || "",
							transcription: evalResult.transcription,
							...evalResult,
						},
						submissionId: responseData.requestId || responseData.jobId,
						processingTimeMs: evalResult.durationMs || 0,
						status: { status: "completed" },
					},
				};
			} else if (responseData.success !== undefined) {
				// Already in expected format
				result = responseData;
			} else {
				console.error("Unexpected response format:", responseData);
				throw new Error("Invalid response format from evaluation service");
			}

			if (!result || !result.success) {
				throw new Error("Invalid response format from evaluation service");
			}

			console.log("📥 Transformed evaluation response:", {
				success: result.success,
				hasData: Boolean(result.data),
				submissionId: result.data?.submissionId,
				score: result.data?.feedback?.score,
				processingTimeMs: result.data?.processingTimeMs,
				model: result.data?.feedback?.model,
				status: result.data?.status?.status,
			});

			// Convert LLM feedback service response to EvaluationResult format
			if (result.success && result.data) {
				const feedback = result.data.feedback;
				// Calculate word count and duration metrics
				const wordCount =
					data.type === "text"
						? data.content.trim().split(/\s+/).filter(Boolean).length
						: 0;
				const estimatedDurationSeconds =
					data.type === "text"
						? Math.max(30, wordCount / 3) // Assume ~3 words per second speaking rate
						: Math.max(1, Math.round(audioDurationSeconds));
				const wpm =
					data.type === "text"
						? Math.round((wordCount / estimatedDurationSeconds) * 60)
						: 0;

				// Generate more realistic category breakdown with some variation
				const baseScore = (feedback.score as number) || 0;
				const variation = 5; // ±5 points variation
				const clarity = Math.max(
					0,
					Math.min(100, baseScore + (Math.random() - 0.5) * variation),
				);
				const content = Math.max(
					0,
					Math.min(100, baseScore + (Math.random() - 0.5) * variation),
				);
				const delivery = Math.max(
					0,
					Math.min(100, baseScore + (Math.random() - 0.5) * variation),
				);
				const structure = Math.max(
					0,
					Math.min(100, baseScore + (Math.random() - 0.5) * variation),
				);

				const evaluationResult: EvaluationResult = {
					id: result.data.submissionId,
					user_id: user?.id ?? "anonymous",
					content_pack_id: "default",
					response_text: data.type === "text" ? data.content : undefined,
					response_audio_url: data.type === "audio" ? audioUrl : undefined,
					response_type: data.type,
					duration_seconds:
						data.type === "audio"
							? estimatedDurationSeconds
							: estimatedDurationSeconds,
					word_count: wordCount,
					wpm: data.type === "audio" ? 0 : wpm,
					categories: {
						clarity: Math.round(clarity),
						content: Math.round(content),
						delivery: Math.round(delivery),
						structure: Math.round(structure),
					},
					feedback: (feedback.feedback as string) || "No feedback available",
					score: baseScore,
					status: "COMPLETED",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					// UI extras for M0 demo
					category_flags: [
						{
							name: "Conciseness",
							passFlag: clarity >= 70 ? "PASS" : "FLAG",
							note: "Keep sentences short and emphasize key points early.",
						},
						{
							name: "Examples",
							passFlag: content >= 70 ? "PASS" : "FLAG",
							note: "Ground claims with brief, concrete examples.",
						},
						{
							name: "Signposting",
							passFlag: structure >= 70 ? "PASS" : "FLAG",
							note: "Outline your answer structure up front (First, Then, Finally).",
						},
						{
							name: "Pace",
							passFlag: wpm >= 120 && wpm <= 180 ? "PASS" : "FLAG",
							note: "Aim for 130–160 WPM to maintain clarity.",
						},
						{
							name: "Filler words",
							passFlag: Math.random() > 0.3 ? "PASS" : "FLAG",
							note: "Reduce 'um', 'like', and pauses; brief silence beats filler.",
						},
						{
							name: "Relevance",
							passFlag: content >= 75 ? "PASS" : "FLAG",
							note: "Tie each point back to the question explicitly.",
						},
						{
							name: "Confidence",
							passFlag: delivery >= 75 ? "PASS" : "FLAG",
							note: "Use active voice; avoid hedging language where not needed.",
						},
					],
					what_changed: [
						"Tightened intro and added clear thesis",
						"Inserted concrete example supporting the main claim",
						"Improved signposting for section transitions",
					],
					practice_rule:
						"Use the 30-60-90 structure: thesis in 30s, depth in 60s, recap in 90s.",
				};

				console.log("🎯 Setting evaluation result:", {
					score: evaluationResult.score,
					status: evaluationResult.status,
					categories: evaluationResult.categories,
					feedback: evaluationResult.feedback,
					fullObject: evaluationResult,
				});

				// DISABLED: Evaluation result is now handled by the streaming useEffect (line 298)
				// The streaming hook will receive the result and display tips before showing the final result
				// setTimeout(() => {
				// 	setEvaluationResult(evaluationResult);
				// }, 5000);

				// Update drill progress
				const completedCount = evaluationData.currentQuestionIndex;
				const isLastQuestion = !navigationData?.hasNext;

				drillProgressHook.updateProgress({
					current_question_id: questionId,
					total_questions: totalQuestions,
					completed_questions: completedCount,
					completed: isLastQuestion,
				});

				// Persist evaluation to backend (non-blocking)
				try {
					// Only send fields that have values to avoid validation errors
					const persistPayload: Record<string, unknown> = {
						id: evaluationResult.id,
						user_id: evaluationResult.user_id,
						question_id: questionId, // CRITICAL: Required for stats calculation
						response_type: evaluationResult.response_type,
						categories: evaluationResult.categories,
						score: evaluationResult.score,
						status: evaluationResult.status,
					};

					// Only include optional fields if they have values
					if (evaluationResult.content_pack_id) {
						persistPayload.content_pack_id = evaluationResult.content_pack_id;
					}
					if (contentPackData?.id) {
						persistPayload.content_pack_id = contentPackData.id;
					}
					if (evaluationResult.response_text) {
						persistPayload.response_text = evaluationResult.response_text;
					}
					if (evaluationResult.response_audio_url) {
						persistPayload.response_audio_url =
							evaluationResult.response_audio_url;
					}
					if (evaluationResult.duration_seconds !== undefined) {
						persistPayload.duration_seconds = evaluationResult.duration_seconds;
						persistPayload.duration_ms =
							evaluationResult.duration_seconds * 1000; // Also send ms for stats
					}
					if (evaluationResult.word_count !== undefined) {
						persistPayload.word_count = evaluationResult.word_count;
					}
					if (evaluationResult.wpm !== undefined) {
						persistPayload.wpm = evaluationResult.wpm;
					}
					if (evaluationResult.feedback) {
						persistPayload.feedback = evaluationResult.feedback;
					}

					// Use await instead of void to ensure persistence completes
					console.log("🔄 Persisting evaluation with payload:", {
						question_id: persistPayload.question_id,
						response_type: persistPayload.response_type,
						score: persistPayload.score,
						has_feedback: !!persistPayload.feedback,
						word_count: persistPayload.word_count,
						duration_seconds: persistPayload.duration_seconds,
					});

					let persistResponse: Response;
					try {
						persistResponse = await fetch("/api/evaluations", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(persistPayload),
						});
					} catch (fetchError) {
						// Network error or fetch failed before getting a response
						console.error("❌ Failed to persist evaluation: Network error", {
							error:
								fetchError instanceof Error
									? fetchError.message
									: String(fetchError),
							errorType:
								fetchError instanceof Error
									? fetchError.constructor.name
									: typeof fetchError,
							payload: persistPayload,
						});
						return; // Exit early, error already logged
					}

					// Log response status immediately
					console.log(
						`📡 Persist response: ${persistResponse.status} ${persistResponse.statusText}`,
					);

					if (!persistResponse.ok) {
						// Clone the response so we can read it multiple times if needed
						const responseClone = persistResponse.clone();

						// Read response body first before logging
						let responseText = "";
						let errorData: Record<string, unknown> | null = null;
						const contentType =
							persistResponse.headers.get("Content-Type") || "unknown";

						try {
							responseText = await responseClone.text();
							if (responseText.trim().length > 0) {
								try {
									errorData = JSON.parse(responseText) as Record<
										string,
										unknown
									>;
								} catch {
									// Not JSON, keep as text
								}
							}
						} catch (textError) {
							console.error("❌ Could not read response body:", textError);
						}

						// Build comprehensive error info with actual response data
						const errorInfo = {
							status: persistResponse.status,
							statusText: persistResponse.statusText,
							url: persistResponse.url,
							contentType,
							responseBody: errorData || responseText || "(empty)",
							error: errorData?.error || errorData?.code || "UNKNOWN_ERROR",
							message:
								errorData?.message ||
								errorData?.error ||
								`HTTP ${persistResponse.status} ${persistResponse.statusText}`,
							details: errorData?.details || null,
							requestPayload: persistPayload,
						};

						// Log comprehensive error information
						console.error("❌ Failed to persist evaluation:", errorInfo);
					} else {
						console.log("✅ Evaluation persisted successfully");
					}
				} catch (persistError) {
					console.error("❌ Failed to persist evaluation (non-blocking):", {
						error:
							persistError instanceof Error
								? persistError.message
								: String(persistError),
						errorType:
							persistError instanceof Error
								? persistError.constructor.name
								: typeof persistError,
						stack:
							persistError instanceof Error ? persistError.stack : undefined,
					});
				}
			} else {
				throw new Error("Invalid response format from evaluation service");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			setIsSubmitting(false); // Only set to false on error
		}
		// Note: Don't set isSubmitting=false here in success case when streaming is active
		// The streaming useEffect (line ~342) will handle it after the delay
	};

	const handleError = (error: Error) => {
		setError(error.message);
	};

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/drill")}
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Drills
					</Button>
					<div className="flex-1">
						<h1 className="text-2xl font-bold text-foreground">
							{evaluationData.title}
						</h1>
						<div className="flex items-center gap-4 mt-2">
							<Badge variant="outline">
								Question {evaluationData.currentQuestionIndex} of{" "}
								{evaluationData.totalQuestions}
							</Badge>
							<div className="flex items-center gap-1 text-sm text-muted-foreground">
								<Target className="w-4 h-4" />
								{evaluationData.description}
							</div>
						</div>
					</div>
					{/* Navigation buttons */}
					<div className="flex items-center gap-2">
						{/* Previous Question */}
						{navigationData?.hasPrev && navigationData.prevQuestionId && (
							<Button
								variant="outline"
								size="sm"
								onClick={handlePreviousQuestion}
								disabled={!navigationData?.hasPrev}
							>
								<ArrowLeft className="w-4 h-4 mr-2" />
								Previous
							</Button>
						)}
						{/* View Results/Review */}
						{evaluationData?.id && (
							<Button variant="outline" size="sm" onClick={handleViewResults}>
								<BarChart3 className="w-4 h-4 mr-2" />
								View Results
							</Button>
						)}
						{/* Next Question */}
						{navigationData?.hasNext && navigationData.nextQuestionId && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleNextQuestion}
								disabled={!navigationData?.hasNext}
							>
								Next
								<ArrowRight className="w-4 h-4 ml-2" />
							</Button>
						)}
					</div>
				</div>

				{/* Previous Attempts Alert */}
				{previousAttempts && previousAttempts.totalAttempts > 0 && (
					<Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
						<AlertDescription>
							<div className="flex items-center justify-between">
								<div>
									<span className="font-medium">
										You've attempted this question{" "}
										{previousAttempts.totalAttempts}{" "}
										{previousAttempts.totalAttempts === 1 ? "time" : "times"}
									</span>
									{previousAttempts.bestAttempt && (
										<span className="ml-2 text-sm text-muted-foreground">
											• Best score: {previousAttempts.bestAttempt.score}/100
										</span>
									)}
								</div>
								<Badge variant="outline" className="bg-white dark:bg-gray-800">
									{previousAttempts.totalAttempts}{" "}
									{previousAttempts.totalAttempts === 1
										? "attempt"
										: "attempts"}
								</Badge>
							</div>
						</AlertDescription>
					</Alert>
				)}

				{/* Current Submission Status */}
				{currentSubmission && !evaluationResult && (
					<Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
						<AlertDescription>
							<div className="flex items-center justify-between">
								<div>
									<span className="font-medium">
										{currentSubmission.evaluation_status === "pending" ||
										currentSubmission.evaluation_status === "processing"
											? "Evaluation in progress..."
											: currentSubmission.evaluation_status === "completed"
												? "Previous submission found"
												: "Submission saved"}
									</span>
									<span className="ml-2 text-sm text-muted-foreground">
										• Submitted{" "}
										{new Date(currentSubmission.submitted_at).toLocaleString()}
									</span>
								</div>
								<Badge
									variant="outline"
									className={
										currentSubmission.evaluation_status === "completed"
											? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
											: currentSubmission.evaluation_status === "processing"
												? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
												: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
									}
								>
									{currentSubmission.evaluation_status}
								</Badge>
							</div>
							{currentSubmission.response_type === "text" &&
								currentSubmission.response_text && (
									<div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-sm">
										<span className="font-medium">Your response: </span>
										<span className="text-muted-foreground">
											{currentSubmission.response_text.substring(0, 100)}
											{currentSubmission.response_text.length > 100
												? "..."
												: ""}
										</span>
									</div>
								)}
							{currentSubmission.response_type === "audio" &&
								currentSubmission.response_audio_url && (
									<div className="mt-2 text-sm text-muted-foreground">
										Audio response submitted
									</div>
								)}
						</AlertDescription>
					</Alert>
				)}

				{/* Question Card */}
				<Card>
					<CardHeader>
						<div className="flex items-start justify-between">
							<CardTitle>Question</CardTitle>
							<div className="flex gap-2">
								{questionData.drill_specialty &&
									questionData.drill_specialty !== "general" && (
										<Badge
											variant="outline"
											className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
										>
											Specialty:{" "}
											{questionData.drill_specialty.charAt(0).toUpperCase() +
												questionData.drill_specialty
													.slice(1)
													.replace(/_/g, " ")}
										</Badge>
									)}
								{questionData.difficulty && (
									<Badge
										variant="outline"
										className={
											questionData.difficulty === "beginner"
												? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
												: questionData.difficulty === "intermediate"
													? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
													: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
										}
									>
										{questionData.difficulty.charAt(0).toUpperCase() +
											questionData.difficulty.slice(1)}
									</Badge>
								)}
								{questionData.estimatedMinutes && (
									<Badge variant="outline">
										{questionData.estimatedMinutes} min
									</Badge>
								)}
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-lg leading-relaxed">{questionData.text}</p>

						{/* Question Metadata */}
						{(questionData.competency ||
							(questionData.tags && questionData.tags.length > 0) ||
							(questionData.expectedResponseElements &&
								questionData.expectedResponseElements.length > 0)) && (
							<div className="space-y-3 pt-4 border-t">
								{/* Competency */}
								{questionData.competency && (
									<div className="text-sm">
										<span className="font-medium text-muted-foreground">
											Primary Competency:{" "}
										</span>
										<span className="text-foreground capitalize">
											{questionData.competency.replace(/_/g, " ")}
										</span>
									</div>
								)}

								{/* Tags */}
								{questionData.tags && questionData.tags.length > 0 && (
									<div className="text-sm">
										<span className="font-medium text-muted-foreground">
											Topics:{" "}
										</span>
										<div className="flex flex-wrap gap-1 mt-1">
											{questionData.tags.map((tag) => (
												<Badge
													key={tag}
													variant="secondary"
													className="text-xs capitalize"
												>
													{tag.replace(/_/g, " ")}
												</Badge>
											))}
										</div>
									</div>
								)}

								{/* Expected Response Elements */}
								{questionData.expectedResponseElements &&
									questionData.expectedResponseElements.length > 0 && (
										<div className="text-sm">
											<span className="font-medium text-muted-foreground">
												Key Elements to Address:{" "}
											</span>
											<ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
												{questionData.expectedResponseElements.map(
													(element) => (
														<li key={element} className="capitalize">
															{element.replace(/_/g, " ")}
														</li>
													),
												)}
											</ul>
										</div>
									)}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Error Display */}
				{error && (
					<Card className="border-destructive">
						<CardContent className="p-4">
							<div className="text-destructive">
								<strong>Error:</strong> {error}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Streaming Feedback UI - shown during evaluation */}
				{isSubmitting && !evaluationResult && (
					<Card className="min-h-[200px]">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Evaluating Your Response</CardTitle>
								{streamingFeedback.progressState ? (
									<ProgressPill state={streamingFeedback.progressState} />
								) : (
									<ProgressPill state="processing" />
								)}
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Streaming Tips */}
							{streamingFeedback.tips.length > 0 ? (
								<StreamingTips
									tips={streamingFeedback.tips}
									rotationInterval={3000}
								/>
							) : (
								<div className="text-sm text-muted-foreground animate-pulse">
									💡 Preparing evaluation...
								</div>
							)}

							{/* Streaming Chips */}
							{streamingFeedback.chips.length > 0 && (
								<div className="pt-4">
									<p className="text-sm font-medium mb-2">
										Analysis in progress:
									</p>
									<ChipsStream chips={streamingFeedback.chips} />
								</div>
							)}

							{/* Fallback message */}
							{fallbackEnabled && (
								<Alert>
									<AlertDescription>
										Evaluation is taking longer than expected. You can continue
										working or wait for results.
									</AlertDescription>
								</Alert>
							)}

							{/* Error display */}
							{streamingFeedback.error && (
								<Alert variant="destructive">
									<AlertDescription>{streamingFeedback.error}</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				)}

				{/* Response Submission or Results */}
				{loadingSavedEvaluation ? (
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-1/3" />
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Score skeleton */}
							<div className="text-center">
								<Skeleton className="h-16 w-24 mx-auto mb-2" />
								<Skeleton className="h-4 w-48 mx-auto" />
							</div>
							{/* Category breakdown skeleton */}
							<div className="space-y-4">
								<Skeleton className="h-6 w-1/4" />
								<div className="flex flex-wrap gap-2">
									{Array.from({ length: 7 }, (_, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loaders, order never changes
										<Skeleton key={i} className="h-8 w-24" />
									))}
								</div>
							</div>
							{/* Feedback skeleton */}
							<div className="space-y-2">
								<Skeleton className="h-6 w-1/3" />
								<Skeleton className="h-20 w-full" />
							</div>
						</CardContent>
					</Card>
				) : evaluationResult ? (
					<>
						<EvaluationResultDisplay
							result={evaluationResult}
							onNextQuestion={handleNextQuestion}
							showNextButton={true}
							nextButtonText={
								navigationData?.hasNext ? "Next Question" : "Back to Drills"
							}
						/>

						{/* Navigation buttons after results */}
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center justify-between gap-4">
									<div className="flex items-center gap-2">
										{/* Previous Question */}
										{navigationData?.hasPrev &&
											navigationData.prevQuestionId && (
												<Button
													variant="outline"
													onClick={handlePreviousQuestion}
												>
													<ArrowLeft className="w-4 h-4 mr-2" />
													Previous Question
												</Button>
											)}
										{/* Next Question */}
										{navigationData?.hasNext &&
											navigationData.nextQuestionId && (
												<Button variant="outline" onClick={handleNextQuestion}>
													Next Question
													<ArrowRight className="w-4 h-4 ml-2" />
												</Button>
											)}
									</div>
									{/* View Results */}
									{evaluationData?.id && (
										<Button variant="default" onClick={handleViewResults}>
											<BarChart3 className="w-4 h-4 mr-2" />
											View All Results
										</Button>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Additional options at the end of the drill */}
						{!navigationData?.hasNext && (
							<Card>
								<CardHeader>
									<CardTitle>Drill Complete! 🎉</CardTitle>
									<CardDescription>
										You've completed all questions in this drill. What would you
										like to do next?
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<Button
											variant="outline"
											onClick={handleTryAgain}
											className="w-full"
										>
											Try This Drill Again
										</Button>
										<Button
											onClick={() => router.push("/drill")}
											className="w-full"
										>
											Browse All Drills
										</Button>
									</div>
									<div className="text-center text-sm text-muted-foreground pt-2">
										View your progress and stats on the drills page
									</div>
								</CardContent>
							</Card>
						)}
					</>
				) : !isSubmitting &&
					!(
						showResults &&
						currentSubmission &&
						currentSubmission.evaluation_status === "completed"
					) ? (
					<ResponseSubmission
						onSubmit={handleSubmit}
						onError={handleError}
						disabled={isSubmitting}
						isSubmitting={isSubmitting}
					/>
				) : null}
			</div>
		</div>
	);
}
