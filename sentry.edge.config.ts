// This file configures the initialization of Sentry for edge features (proxy, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note: Edge features in Next.js are different from platform-specific edge runtimes.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: "https://29f27651e88773d805d40423d4630930@o4510196119699456.ingest.us.sentry.io/4510221835239424",

	// Enable logs to be sent to Sentry
	enableLogs: true,

	// Enable sending user PII (Personally Identifiable Information)
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
	sendDefaultPii: true,

	// Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
	tracesSampleRate: 1,
});
