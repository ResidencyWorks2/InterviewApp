# Deprecation Warnings

## util._extend Deprecation Warning

**Warning Message:**
```
(node:XXXXX) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
```

**Status:** Known issue from dependency, not our code

**Root Cause:**
This deprecation warning originates from a transitive dependency, likely from one of the following packages:
- `require-in-the-middle` (used for instrumentation)
- `import-in-the-middle` (used for instrumentation)
- Other instrumentation or monitoring dependencies

**Impact:**
- **Low**: This is a deprecation warning, not an error
- The application continues to function normally
- The warning appears in development mode console output
- Does not affect production builds (Next.js removes console output in production)

**Resolution:**
1. **Short-term**: No action required. The warning is harmless and will be resolved when dependencies update.
2. **Long-term**: Monitor dependency updates. When `require-in-the-middle` or related packages release updates that remove `util._extend`, update those dependencies.

**To Trace the Source:**
If you want to identify the exact package causing the warning, run:
```bash
node --trace-deprecation node_modules/.bin/next dev
```

**Related Dependencies:**
- `require-in-the-middle`: Used for OpenTelemetry instrumentation
- `import-in-the-middle`: Used for module instrumentation
- These are typically transitive dependencies of `@opentelemetry/instrumentation` or similar packages

**Note:**
This warning does not indicate a problem with InterviewApp code. It's a Node.js deprecation notice for an internal API that dependencies are still using. The Node.js team will eventually remove `util._extend`, but dependencies have time to migrate before that happens.
