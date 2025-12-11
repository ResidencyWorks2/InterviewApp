---
name: fix
description: Error-resolution workflow for every defect or incident task
args: []
---

# Task
You MUST:
- Re-read this file at the start of every fix request to keep the workflow fresh.
- **Constitution Compliance**: Follow `.specify/memory/constitution.md` principles (Code Quality, Architecture, Test-First Development, MCP Workflow).
- **Sequential Thinking (MANDATORY)**: Invoke the `sequential-thinking` MCP server (`@modelcontextprotocol/server-sequential-thinking`) before any non-trivial decision, capturing hypotheses, unknowns, risk level, and verification criteria for the fix. This is NON-NEGOTIABLE per Constitution IV.
- **Serena Tools (MANDATORY)**: Use `serena` MCP server (via `uvx` from `git+https://github.com/oraios/serena`) for discovery, navigation, scoped edits, and project memory. Full-file reads happen ONLY when Serena cannot retrieve necessary context. This is NON-NEGOTIABLE per Constitution IV.
- Treat Spec Kit constitution, specs, and plans as constraints for how the system should behave and how fixes should be applied. If the bug reveals a gap in the spec, plan to update Spec Kit after the fix.
- Use Serena project memories to recall existing decisions and behaviours that may explain the defect, such as Supabase migration rules, Next.js 16 quirks, PHI scrubbing rules, or evaluation pipeline design.
- **Context7 (MANDATORY)**: Use `context7` MCP server (via `@upstash/context7-mcp`) to pull the latest runbooks, dependency docs, and MCP specs that relate to the defect; cite what you learn in your reasoning. This is NON-NEGOTIABLE per Constitution IV.
- **MCP Tool Compliance**: Honour MCP schemas: call `tools/list` before first use when needed, send only spec compliant payloads, respect `execution.taskSupport`, and report `tools/call` failures verbatim with your interpretation of what went wrong. Bubble up tool errors verbatim.
- **MCP Server References**: Use the appropriate MCP server for each domain:
  - `supabase` (via `https://mcp.supabase.com/mcp`) for database operations, migrations, type generation
  - `posthog` (via `https://mcp.posthog.com/mcp`) for analytics (with PII scrubbing)
  - `Sentry` (via `mcp-remote@latest` → `https://mcp.sentry.dev/mcp`) for error tracking (with PII scrubbing)
  - `accessibility` (via `a11y-color-contrast-mcp`) for UI accessibility checks
  - `Railway` (via `@railway/mcp-server`) for deployment operations
- Surface blockers, undocumented behaviour, or missing specs immediately and request guidance instead of guessing.

# Steps
1. **Intake and plan**
   - **MANDATORY**: Invoke `sequential-thinking` MCP server and restate:
     - The observed error or defect and where it appears.
     - Affected feature areas or modules.
     - Initial hypotheses for root cause.
     - Planned Serena, Spec Kit, Context7, and other MCP actions.
     - A concrete validation strategy for confirming the fix.
     - This is NON-NEGOTIABLE per Constitution IV.
   - Check Serena memories (via Serena MCP) and Spec Kit constitution (`.specify/memory/constitution.md`) for any existing constraints or prior decisions that might influence the fix, such as security, data scrubbing, or worker behaviour.

2. **Reproduce**
   - Recreate the issue using the smallest viable environment: relevant tests, scripts, or API routes in the Next.js app and worker.
   - Capture the exact conditions under which the issue appears, including input shapes, auth context, and environment.
   - If reproduction fails, document the discrepancy and adjust hypotheses before changing code.

3. **Discovery and spec alignment**
   - **MANDATORY**: Use Serena MCP discovery tools to locate the responsible code paths (NON-NEGOTIABLE per Constitution IV):
     - `search_for_pattern` for error messages, log keys, or suspect symbols.
     - `find_symbol` and `get_symbols_overview` to identify handlers, services, or domain entities involved.
     - `find_referencing_symbols` or `find_referencing_code_snippets` to trace where the faulty behaviour is triggered.
     - **Avoid full-file reads**: Only read entire files when Serena tools cannot provide necessary context.
   - Check for Spec Kit specs or plans that cover this feature or flow under `.specify`.
     - If they exist, confirm the intended behaviour and note deviations.
     - If they are missing or incomplete, plan to extend Spec Kit after you understand the root cause.

4. **Documentation sync**
   - **MANDATORY**: Use Context7 MCP server to confirm behaviour for any third-party or MCP component involved in the defect, such as:
     - Next.js 16 edge behaviour for routes, proxies, or streaming.
     - Supabase clients and migration expectations (use Supabase MCP for DB operations).
     - BullMQ job lifecycle and failure handling.
     - Sentry and PostHog configuration and limits (use Sentry/PostHog MCP servers for operations).
     - This is NON-NEGOTIABLE per Constitution IV.
   - Update your mental plan and hypotheses based on new facts from documentation and mention which docs informed your direction.

5. **Fix implementation**
   - Implement the smallest coherent change that corrects the root cause and aligns behaviour with the Spec Kit spec and constitution.
   - **MANDATORY**: Use Serena MCP editing tools (`replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`, `replace_content` (regex/literal)) for focused, minimal edits. Full-file writes only when Serena cannot handle the edit. This is NON-NEGOTIABLE per Constitution IV.
   - Respect architecture boundaries: domain layer stays pure, application coordinates use cases, infrastructure handles adapters, presentation stays thin (Constitution II).
   - **Constitution Compliance**: Ensure all code passes Biome formatting/linting (Constitution I), follows Onion Architecture (Constitution II), and maintains TypeScript strict mode.
   - If the bug reveals that the spec is wrong or incomplete, choose either:
     - Align the fix to the correct user behaviour and schedule a Spec Kit update, or
     - Align the fix to the spec and call out that the product behaviour may be undesirable.
   - Document any non-obvious tradeoffs or known side effects in code comments where genuinely useful (JSDoc for exported functions/services per Constitution I).

6. **Validation**
   - Re-run the original reproduction scenario and confirm the defect is resolved.
   - Run targeted tests and relevant suites, such as unit tests for the affected feature, integration tests for the flow, and e2e tests where appropriate.
   - Run linters and type checking if the change is non-trivial.
   - Note any unverified areas or tests that were not run as explicit risks.

7. **Wrap-up, Spec Kit, and memory**
   - Summarise the root cause in clear terms, including which layers and components were involved.
   - Summarise the fix and list the files and symbols touched.
   - Reference any Context7 docs or tool schemas that guided the fix.
   - If the defect exposes a gap or incorrect statement in Spec Kit spec or plan, describe the required updates and, when appropriate, plan to run the relevant Spec Kit command to update them.
   - Use Serena MCP `write_memory` to capture durable lessons:
     - New constraints or invariants uncovered by the bug.
     - Known pitfalls, for example a fragile interaction between Supabase, the worker
   - **MCP Compliance Report**: Explicitly reference which Serena/Context7/MCP steps were performed so reviewers can trace compliance (Constitution IV).
   - **Accessibility Check**: If UI changes were made, use `accessibility` MCP server to verify WCAG contrast requirements before merging.
   - **Deployment Check**: If infrastructure changes were made, coordinate with `Railway` MCP server for deployment verification.
