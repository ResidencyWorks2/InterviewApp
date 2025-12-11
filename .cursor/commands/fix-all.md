---
name: fix-all
description: Run project-wide fix command to lint, format, and correct TypeScript errors (especially remove use of `any`)
args: []
flags:
  - name: dry-run
    description: Print the plan without making changes
    required: false
---

# Task
You MUST:
- **Constitution Compliance**: Follow `.specify/memory/constitution.md` principles (Code Quality, Architecture, Test-First Development, MCP Workflow).
- Follow `.cursor/commands/go.md`: rely on Serena MCP tools for semantic code retrieval/editing, use Context7 MCP for third-party documentation (including MCP tooling guidance), and invoke the `sequential-thinking` MCP server before making decisions.
- **Sequential Thinking (MANDATORY)**: Invoke the `sequential-thinking` MCP server (`@modelcontextprotocol/server-sequential-thinking`) before any non-trivial decision. This is NON-NEGOTIABLE per Constitution IV.
- **Serena Tools (MANDATORY)**: Use `serena` MCP server (via `uvx` from `git+https://github.com/oraios/serena`) for code discovery and editing. Full-file reads happen ONLY when Serena cannot retrieve necessary context. This is NON-NEGOTIABLE per Constitution IV.
- **Context7 (MANDATORY)**: Use `context7` MCP server (via `@upstash/context7-mcp`) for third-party documentation and MCP tooling guidance. This is NON-NEGOTIABLE per Constitution IV.
- Run `pnpm fix:all`, which includes commands:
  - `biome check . --write` (Constitution I: Code Quality)
  - `tsc --noEmit` (Constitution I: TypeScript strict mode)
- After lint/format passes, scan TypeScript project for uses of the `any` type using Serena MCP tools and produce either:
  - automatic fixes where safe (e.g., infer a more specific type)
  - or report locations where `any` remains and require manual fix.
- Ensure type errors caused by `any` or implicit `any` are surfaced and fixed.
- If `--dry-run` flag is present: do not write or modify files, but print list of errors/issues discovered and proposed fixes.

# Steps
1. **MANDATORY**: Re-read `.cursor/commands/go.md`, invoke the `sequential-thinking` MCP server to outline your execution plan, and use Context7 MCP server to refresh any needed MCP tool documentation so every subsequent Serena/tool invocation follows spec. This is NON-NEGOTIABLE per Constitution IV.
2. Run `pnpm fix:all`. If command fails: capture error output, stop with failure status.
3. If passes, scan `.ts`/`.tsx` files for `: any` or implicit `any` using Serena MCP search/edit tools (`search_for_pattern`, `find_symbol`):
   - Log each occurrence with file path and line number.
   - Optionally replace `: any` with `unknown` or a more specific type stub using Serena MCP editing tools (`replace_symbol_body`, `replace_content`).
   - **Avoid full-file reads**: Use Serena tools to locate and fix `any` types efficiently.
4. Re-run `tsc --noEmit` (or incremental build) to confirm no type errors remain.
5. Report summary: number of files modified, number of `any` instances replaced, number of remaining `any` occurrences requiring manual fix.
6. **MCP Compliance Report**: Explicitly reference which Serena/Context7/MCP steps were performed so reviewers can trace compliance (Constitution IV).
7. Respect `--dry-run`: in that mode skip writing changes, only print plan.

# Usage
```bash
/fix-all
/fix-all --dry-run
