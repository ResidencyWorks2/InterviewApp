---
name: go.speckit
description: Spec Kit driven workflow for InterviewApp, coordinated with Serena and MCP tools
args: []
---

# Task

You MUST:

- Re-read this file at the start of every request so the workflow stays fresh.
- Invoke the sequential thinking tool before any non-trivial decision, outlining the plan, unknowns, and verification steps.
- Treat Spec Kit artifacts in `.specify` (constitution, specs, plans, tasks) as the source of truth for what to build and why.
- Prefer Serena tools for all code discovery, symbol navigation, semantic edits, pattern searches, and project-specific memory operations; avoid brute-force full-file reads unless strictly required.
- Use Serena project memories (`list_memories`, `read_memory`, `write_memory`, `delete_memory`) to recall and persist durable InterviewApp knowledge such as architecture, Supabase workflow, Next.js 16 patterns, and security rules.
- Use Context7 to pull up to date documentation for third-party dependencies and relevant MCP tools; cite the key findings in your reasoning.
- When calling MCP tools, follow the spec: discover capabilities with `tools/list`, only issue schema-compliant `tools/call` requests, respect `execution.taskSupport`, and propagate `tool_use` and `tool_results` batches as required.
- Surface uncertainties quickly and ask the user for clarification when requirements, constraints, or risk are ambiguous.

# Steps

1. **Kickoff and alignment**

   - Run the sequential thinking tool and capture:
     - The concrete user goal for this session (for example: new feature in `scheduling`, bug fix in `auth`, change in `billing`, tweak to evaluation pipeline).
     - Known risks and unknowns.
     - The Serena, Spec Kit, Context7, and other MCP actions you expect to take.
   - Determine whether the work should be Spec Kit driven:
     - Use `/go.speckit` for new features, non-trivial refactors, or complex bug fixes that need explicit specs and plans.
     - Use `/go` for quick, well scoped tweaks.
   - Load relevant Serena memories using `list_memories` and `read_memory`, especially:
     - Supabase workflow and migration rules.
     - Next.js 16 patterns and proxy behavior.
     - Any existing memory for this feature area or module.

2. **Spec Kit phase 1: Constitution check**

   - Look for `.specify/constitution.md`:
     - If it exists, skim it and restate the principles that matter for this task:
       - Onion architecture boundaries (domain, application, infrastructure, presentation).
       - DDD rules and feature slice isolation.
       - Testing expectations and coverage.
       - Security and PHI scrubbing rules.
     - If it does not exist or is clearly missing important principles, plan to run `/speckit.constitution` with a prompt that reflects InterviewApp’s architecture and compliance needs.
   - If the constitution adds new long lived principles that are not already captured in Serena memory, use `write_memory` to add a small number of named entries such as:
     - `IA: constitution highlights`
     - `IA: testing and coverage rules`
     - `IA: security and PHI scrubbing rules`

3. **Spec Kit phase 2: Specification**

   - Ensure there is a Spec Kit spec for the current piece of work under `.specify`:
     - If no spec exists, run `/speckit.specify` with a user-focused description of the expected behavior in the app, including input types (text or audio), evaluation pipeline, and expected outputs.
     - If a spec exists, read it and confirm it matches the user’s current request and constraints.
   - If you discover gaps between the spec and the user’s request, adjust the spec via Spec Kit before writing code.
   - When the spec describes behavior that will obviously matter in future work, store a concise summary in Serena memory, for example:
     - `IA: spec summary for [feature name]`

4. **Spec Kit phase 3: Plan**

   - Use `/speckit.plan` to create or update a technical implementation plan that respects:
     - The onion architecture layers defined in `initial_prompt`.
     - Feature modules such as `booking`, `scheduling`, `auth`, `billing`, `notifications`.
     - Supabase and database type generation workflow.
     - Queue and worker topology for BullMQ.
     - Observability via Sentry and PostHog with scrubbing.
   - Review the plan critically:
     - Ensure domain logic remains pure and framework independent.
     - Confirm that Supabase migrations and type updates follow the documented workflow.
     - Check that Next.js 16 specific behaviors (async `params`, `proxy.ts`, server components) are correctly handled.
   - Save only durable structural decisions in Serena memory via `write_memory`, for example:
     - `IA: implementation plan decisions for [feature name]`

5. **Spec Kit phase 4: Tasks**

   - Run `/speckit.tasks` to derive a tasks list from the plan.
   - Inspect the tasks and:
     - Confirm coverage for domain, application, infrastructure, and presentation layers.
     - Include tests (unit, integration, e2e) and type updates where relevant.
   - Use the tasks list as your working backbone:
     - Work task by task.
     - Explicitly track which task is currently being executed in your reasoning.
   - Optionally, store a high level task overview in Serena memory if it will be reused, for example:
     - `IA: tasks overview for [feature name]`

6. **Implementation with Serena and MCP tools**

   - For each task:
     - Use Serena discovery tools to locate and understand the relevant areas:
       - `list_dir` to inspect module layout under `src/features`, `src/domain`, `src/application`, `src/infrastructure`, and `src/presentation`.
       - `get_symbols_overview` and `find_symbol` to identify key entities, services, handlers, and React components.
       - `find_referencing_symbols` and `find_referencing_code_snippets` to locate call sites and data flow.
     - Use Context7 to:
       - Confirm any unclear behavior for Next.js 16, Supabase client patterns, BullMQ, Sentry, and PostHog.
       - Check MCP tool schemas when using Supabase MCP or other infra-facing tools.
     - Apply edits using Serena editing tools:
       - `insert_at_line`, `replace_lines`, `replace_symbol_body`, `insert_before_symbol`, and `insert_after_symbol`.
     - Keep edits tightly scoped to the current task and aligned with the spec and plan.
   - When invoking MCP tools:
     - Ensure payloads are schema compliant.
     - Handle errors by reporting them and adjusting your approach or inputs.

7. **Verification and tests**

   - Use the plan and tasks list to ensure:
     - All necessary code paths and edge cases are implemented.
     - Tests are written or updated according to the constitution and InterviewApp’s testing section:
       - Vitest unit and integration tests.
       - Playwright e2e tests where needed.
     - Supabase migrations are created via CLI and types regenerated as required.
   - Use existing Serena memories for commands like `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm lint:boundaries`, and `pnpm update-types` if they have been stored.
   - Record any new or corrected verification commands in Serena memory if they will matter again.

8. **Wrap up and memory updates**

   - Use Serena’s `summarize_changes` to obtain a structured description of edits where appropriate.
   - Cross check implementation versus:
     - The Spec Kit spec.
     - The plan.
     - The tasks list.
     - The onion architecture and feature module rules in `initial_prompt`.
   - Update Serena memory via `write_memory` to reflect:
     - New or changed architectural decisions.
     - Behavior changes that affect how interviews are scheduled, evaluated, or billed.
     - Important workflow updates (for example: changes to migration or type generation commands).
     - Any non-obvious security, PHI scrubbing, or compliance constraints clarified during the work.
   - Summarise the outcome for the user:
     - Reference the relevant Spec Kit files under `.specify` (constitution, spec, plan, tasks).
     - List the key files and symbols touched.
     - Note which Serena memories were created or updated.
     - Call out remaining risks, open questions, or suggested next tasks.

# Usage

Invoke `/go.speckit` when you want a full Spec Kit driven workflow for InterviewApp. This is ideal for new features, significant refactors, and complex bugs that need a clear spec and plan. Use `/go` for smaller, well bounded tasks.

# $ARGUMENTS
