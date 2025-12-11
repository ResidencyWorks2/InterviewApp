---
name: go
description: Baseline workflow that governs every task in this workspace
args: []
---

# Task
You MUST:
- Re-read this file at the start of every request so the workflow stays fresh.
- **Constitution Compliance**: Follow `.specify/memory/constitution.md` principles (Code Quality, Architecture, Test-First Development, MCP Workflow).
- **Sequential Thinking (MANDATORY)**: Invoke the `sequential-thinking` MCP server (`@modelcontextprotocol/server-sequential-thinking`) before any non-trivial decision, capturing the goal, unknowns, risks, and verification steps. This is NON-NEGOTIABLE per Constitution IV.
- Treat Spec Kit artifacts in `.specify` (constitution, specs, plans, tasks) as the primary source of truth for feature work and non-trivial refactors.
- **Serena Tools (MANDATORY)**: Use `serena` MCP server (via `uvx` from `git+https://github.com/oraios/serena`) for all code discovery, symbol navigation, semantic edits, pattern searches, and project-specific memory operations. Full-file reads happen ONLY when Serena cannot retrieve necessary context. This is NON-NEGOTIABLE per Constitution IV.
- Use Serena project memory (`list_memories`, `read_memory`, `write_memory`, `delete_memory`) to recall and maintain durable InterviewApp knowledge, for example Supabase workflow, Next.js 16 patterns, PHI scrubbing rules, and testing standards.
- **Context7 (MANDATORY)**: Use `context7` MCP server (via `@upstash/context7-mcp`) to pull up-to-date documentation for every third-party dependency and MCP tool stack; cite the relevant findings in your rationale. This is NON-NEGOTIABLE per Constitution IV.
- **MCP Tool Compliance**: When calling MCP tools, follow the spec: discover capabilities with `tools/list`, only issue schema-compliant `tools/call` requests, respect `execution.taskSupport`, and propagate `tool_use` and `tool_results` batches exactly as described in the latest spec. Bubble up tool errors verbatim.
- **MCP Server References**: Use the appropriate MCP server for each domain:
  - `supabase` (via `https://mcp.supabase.com/mcp`) for database operations, migrations, type generation
  - `posthog` (via `https://mcp.posthog.com/mcp`) for analytics (with PII scrubbing)
  - `Sentry` (via `mcp-remote@latest` → `https://mcp.sentry.dev/mcp`) for error tracking (with PII scrubbing)
  - `accessibility` (via `a11y-color-contrast-mcp`) for UI accessibility checks
  - `Railway` (via `@railway/mcp-server`) for deployment operations
- Surface uncertainties quickly and ask the user for guidance instead of assuming, especially when behaviour might conflict with the Spec Kit constitution or specs.

# Steps
1. **Kickoff and alignment**
   - **MANDATORY**: Invoke `sequential-thinking` MCP server to restate the user request, identify risks and unknowns, and outline the concrete Serena, Spec Kit, Context7, and other MCP actions you expect to take. This is NON-NEGOTIABLE per Constitution IV.
   - Load relevant Serena memories for InterviewApp, such as architecture, Supabase workflow, Next.js 16 rules, and security constraints. Use Serena MCP `list_memories` and `read_memory` to refresh them.
   - Check for Spec Kit constitution under `.specify/memory/constitution.md`. If present, identify which principles apply to this task. If missing or clearly incomplete for the task, plan to use Spec Kit commands to extend it before large changes.

2. **Spec and plan sync**
   - Look for an existing Spec Kit spec and plan for the relevant feature under `.specify` (for example a spec file and a plan file that match this feature or module).
   - If a suitable spec and plan already exist, read and summarise them and confirm that the current request fits within their scope.
   - If there is no suitable spec or plan, or the request exceeds the existing scope, plan to use Spec Kit commands (for example `/speckit.specify` and `/speckit.plan`) to create or refine them before deep implementation.
   - Capture any new long-lived decisions from the spec or plan in Serena memory, for example `IA: spec summary for <feature>` or `IA: plan decisions for <feature>`.

3. **Discovery**
   - **MANDATORY**: Use Serena MCP server to explore the codebase in a targeted way (NON-NEGOTIABLE per Constitution IV):
     - `list_dir` to inspect the relevant directories (for example `src/features/<feature>`, `src/domain`, `src/application`, `src/infrastructure`, `src/presentation`).
     - `search_for_pattern` to find related routes, handlers, services, or feature flags.
     - `get_symbols_overview` and `find_symbol` to locate key entities, services, and React components.
   - Use the Spec Kit plan and tasks (if present) to decide which parts of the code to inspect first, staying aligned with the planned technical approach.
   - **Avoid full-file reads**: Only read entire files when Serena tools cannot provide the necessary context.

4. **Documentation sync**
   - **MANDATORY**: Before describing or changing behaviour that depends on third-party libraries or MCP tools, use Context7 MCP server to confirm current behaviour, error codes, and tool schemas. This is NON-NEGOTIABLE per Constitution IV.
   - Focus Context7 on technologies actually used here, such as Next.js 16 App Router behaviour, Supabase client patterns, BullMQ, Sentry, and PostHog.
   - Integrate these findings into your reasoning and mention which docs or schemas you relied on.
   - When using Supabase, PostHog, Sentry, or other MCP tools, reference their respective MCP servers for operations and configuration.

5. **Tool hygiene and execution**
   - **MCP Compliance**: Verify MCP tools with `tools/list` when needed, and honour any `toolChoice` or capability constraints. Follow spec-compliant flows per Constitution IV.
   - Validate all `tools/call` inputs against schemas, and treat errors as first-class signals to adjust your approach or ask for guidance. Bubble up tool errors verbatim.
   - **MANDATORY**: Apply edits using Serena MCP editing tools where possible: `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`, `replace_content` (regex/literal). Full-file reads/writes only when Serena cannot handle the edit.
   - Keep edits minimal and coherent and align them with the Spec Kit spec, plan, and tasks. Avoid mixing unrelated refactors with the current task unless the spec and plan explicitly say so.
   - **Constitution Compliance**: Ensure all code passes Biome formatting/linting (Constitution I), follows Onion Architecture (Constitution II), and maintains TypeScript strict mode.

6. **Wrap-up, Spec Kit, and memory**
   - Use Serena MCP `summarize_changes` where appropriate to capture a structured summary of files and symbols touched.
   - Cross check the result against the Spec Kit spec and plan and note any intentional deviations or follow up items.
   - Update Spec Kit artifacts if the work has changed behaviour in a way that affects requirements or design, for example updating the spec or plan to reflect reality.
   - Use Serena MCP `write_memory` to record durable decisions and behaviours, including any new commands, workflow adjustments, or tricky business rules uncovered.
   - **MCP Compliance Report**: Explicitly reference which Serena/Context7/MCP steps were performed so reviewers can trace compliance (Constitution IV).
   - **Accessibility Check**: If UI changes were made, use `accessibility` MCP server to verify WCAG contrast requirements before merging.
   - **Deployment Check**: If infrastructure changes were made, coordinate with `Railway` MCP server for deployment verification.
   - Summarise outcomes for the user: describe previous versus new behaviour, list key files and symbols touched, reference relevant Spec Kit documents, mention which Serena memories were created or updated, and propose next steps or tests.

# Usage
Invoke `/go` (or implicitly follow these steps) whenever beginning a new piece of work in this repo. Use this workflow especially when the work should be reflected in Spec Kit specs and plans. No arguments are required.

#$ARGUMENTS
