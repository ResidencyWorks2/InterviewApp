# Implementation Plan: Micro-Checklists

**Branch**: `001-micro-checklists` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-micro-checklists/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Micro-Checklists enables users to access category-specific coaching checklists from evaluation results, track their practice progress by checking off items, and include completed items in Playbook exports. The feature is partially implemented with database schema, API endpoints, and UI components already in place. This plan focuses on completing integration, adding analytics events, and ensuring comprehensive test coverage.

**Technical Approach**: Leverage existing Onion Architecture with feature module pattern. Complete Playbook export integration, add PostHog analytics events with PII scrubbing, and implement comprehensive test coverage following TDD principles.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode)
**Primary Dependencies**: Next.js 16.0.7, React 19.2.1, Supabase (PostgreSQL), PostHog, Radix UI, Tailwind CSS 4.x
**Storage**: Supabase PostgreSQL (checklist_templates, checklist_completions tables)
**Testing**: Vitest (unit/integration), Playwright (e2e)
**Target Platform**: Web (Next.js App Router, server and client components)
**Project Type**: Web application (Next.js monorepo)
**Performance Goals**:
- Checklist modal opens within 2 seconds (SC-001)
- Checklist item state changes reflect in UI within 500ms (SC-002)
- Playbook export including checklist items completes in under 5 seconds (SC-006)
**Constraints**:
- Must maintain Onion Architecture boundaries
- Must use generated database types from Supabase
- Must scrub PII from analytics events
- Must follow Next.js 16 patterns (async params, proxy.ts)
- Must rate limit checklist completion toggles to 10 requests per minute per user
**Scale/Scope**:
- Supports all authenticated users
- Checklist templates are shared across all users
- Completion state is per-user per-evaluation
- Expected: 1000+ concurrent users, 10k+ evaluations/day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality Gates:**

- [x] TypeScript strict mode enabled
- [x] Biome formatting and linting configured
- [x] lefthook hooks configured for pre-commit/pre-push
- [x] JSDoc comments planned for all exported functions

**Architecture Gates:**

- [x] Onion Architecture pattern identified
- [x] Domain layer independence from frameworks confirmed
- [x] Interface adapters using DI pattern planned

**Testing Gates:**

- [x] Test-first approach planned
- [x] Vitest configuration planned
- [x] 80% coverage target set
- [x] Unit and integration test strategy defined

**Tooling Gates:**

- [x] pnpm as package manager confirmed
- [x] Devcontainer with Node.js LTS, Biome, lefthook planned
- [x] No ESLint/Prettier (Biome only)

**Performance Gates:**

- [x] Core loop performance targets defined (≤250ms)
- [x] Redis lookup targets defined (≤50ms)
- [x] Content validation targets defined (≤1s)
- [x] Checklist-specific targets defined (2s modal load, 500ms UI feedback, 5s export)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified
- [x] Supabase for auth/storage/DB planned
- [x] Vercel for deployment planned
- [x] PostHog for analytics planned
- [x] Sentry for error tracking planned

## Project Structure

### Documentation (this feature)

```
specs/001-micro-checklists/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── domain/                          # Domain layer (pure business logic)
│   └── evaluation/                  # Evaluation domain entities
│       └── checklist/               # NEW: Checklist domain entities
│           ├── ChecklistTemplate.ts # Domain entity for template
│           └── ChecklistCompletion.ts # Domain entity for completion
├── application/                      # Application layer (use cases)
│   └── checklist/                   # NEW: Checklist use cases
│       ├── GetChecklistUseCase.ts   # Fetch checklist for category
│       ├── ToggleCompletionUseCase.ts # Toggle item completion
│       └── ExportChecklistUseCase.ts # Export completed items
├── infrastructure/                   # Infrastructure layer (adapters)
│   ├── supabase/                    # Supabase adapters
│   │   └── checklist/               # NEW: Checklist Supabase adapters
│   │       ├── ChecklistTemplateRepository.ts
│   │       └── ChecklistCompletionRepository.ts
│   └── analytics/                   # Analytics adapters
│       └── posthog/                  # PostHog adapter (existing)
├── presentation/                     # Presentation layer
│   └── api/                          # API routes
│       └── checklist/                # EXISTING: API routes
│           ├── route.ts              # GET /api/checklist
│           ├── complete/route.ts     # POST /api/checklist/complete
│           └── export/route.ts      # GET /api/checklist/export
├── app/                              # Next.js App Router
│   └── (dashboard)/                  # Dashboard routes
│       └── drill/                    # Drill pages
│           └── [id]/page.tsx        # EXISTING: Uses ChecklistModal
├── components/                       # React components
│   └── drill/                        # EXISTING: Drill components
│       ├── ChecklistModal.tsx        # EXISTING: Modal component
│       └── EvaluationResultDisplay.tsx # EXISTING: Uses ChecklistModal
└── features/                         # Feature modules (vertical slices)
    └── scheduling/                   # Evaluation feature
        └── checklist/                # NEW: Checklist feature module
            ├── domain/                # Checklist domain logic
            ├── application/           # Checklist use cases
            ├── infrastructure/        # Checklist adapters
            └── presentation/          # Checklist UI components

tests/
├── unit/                             # Unit tests
│   └── checklist/                    # NEW: Checklist unit tests
│       ├── ChecklistTemplate.test.ts
│       ├── ChecklistCompletion.test.ts
│       ├── GetChecklistUseCase.test.ts
│       └── ToggleCompletionUseCase.test.ts
├── integration/                      # Integration tests
│   └── checklist/                    # NEW: Checklist integration tests
│       ├── checklist-api.test.ts     # API endpoint tests
│       └── checklist-export.test.ts # Export integration tests
└── e2e/                              # E2E tests
    └── checklist/                    # NEW: Checklist E2E tests
        └── checklist-flow.spec.ts   # Full user flow test

supabase/
└── migrations/                       # Database migrations
    └── 20251206010000_create_checklist_tables.sql # EXISTING: Schema migration
```

**Structure Decision**: The feature follows the existing InterviewApp Onion Architecture with feature module pattern. Since checklist functionality is closely tied to evaluation results, it will be organized as a sub-feature under the `scheduling` feature module (which handles evaluations). The existing API routes and UI components will be refactored to use the new domain/application layers while maintaining backward compatibility.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No violations identified. The implementation follows all constitution principles:
- Onion Architecture boundaries respected
- Domain logic remains pure
- Test-first approach planned
- Performance targets defined
- MCP integration planned

## Phase 0: Outline & Research

**Status**: Ready to generate research.md

**Research Tasks**:

1. **Playbook Export Integration Pattern**
   - Research: How is the main Playbook export currently implemented?
   - Decision needed: Should checklist export be a separate endpoint or integrated into main export?
   - Rationale: Need to understand existing export architecture to integrate checklist data

2. **PostHog Analytics Event Patterns**
   - Research: How are analytics events currently structured in InterviewApp?
   - Decision needed: Event payload structure for checklist_opened and checklist_completed
   - Rationale: Must follow existing patterns and ensure PII scrubbing

3. **Optimistic UI Update Patterns**
   - Research: How are optimistic updates currently handled in the codebase?
   - Decision needed: Error handling and rollback strategy for failed checklist updates
   - Rationale: ChecklistModal already uses optimistic updates, need to ensure consistency

4. **Next.js 16 Server Component Patterns**
   - Research: Best practices for server components vs client components for checklist features
   - Decision needed: Which parts should be server vs client components?
   - Rationale: Ensure proper use of Next.js 16 patterns

**Output**: research.md with all decisions documented

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete

### Data Model

**Entities** (from spec):

1. **ChecklistTemplate**
   - Fields: id (UUID), category (TEXT), item_text (TEXT), display_order (INTEGER), is_active (BOOLEAN), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ)
   - Relationships: One-to-many with ChecklistCompletion
   - Validation: category must match evaluation category names, item_text required, display_order >= 0

2. **ChecklistCompletion**
   - Fields: id (UUID), user_id (UUID), evaluation_id (TEXT), template_id (UUID), completed_at (TIMESTAMPTZ), created_at (TIMESTAMPTZ)
   - Relationships: Many-to-one with ChecklistTemplate, Many-to-one with User, Many-to-one with EvaluationResult
   - Validation: Unique constraint on (user_id, evaluation_id, template_id)
   - State transitions: None (boolean completed state)

3. **EvaluationResult** (existing)
   - Relationship: One-to-many with ChecklistCompletion
   - Additional fields: delivery_note (TEXT) - optional coaching note for Playbook export

**Output**: data-model.md with detailed entity definitions

### API Contracts

**Endpoints** (existing, may need updates):

1. **GET /api/checklist**
   - Query params: category (string), evaluationId (string)
   - Response: { items: ChecklistItem[], category: string, evaluationId: string }
   - Status: Existing, may need analytics event addition

2. **POST /api/checklist/complete**
   - Body: { evaluation_id: string, template_id: string, completed: boolean }
   - Response: { completed: boolean, completion?: ChecklistCompletion }
   - Status: Existing, may need analytics event addition

3. **GET /api/checklist/export**
   - Query params: evaluationId (string)
   - Response: { evaluationId: string, completions: Record<string, Array>, formattedText: string, totalCompleted: number, categoriesCount: number }
   - Status: Existing, needs integration with main Playbook export

**New Requirements**:
- Add analytics events: checklist_opened, checklist_completed
- Integrate checklist export into main Playbook export endpoint

**Output**: contracts/api-specification.md with OpenAPI schema

### Quickstart Guide

**Output**: quickstart.md with:
- Feature overview
- How to access checklists
- How to complete items
- How to export Playbook with checklist items
- Testing instructions

## Phase 2: Implementation Phases

**Note**: This phase will be detailed in tasks.md (generated by /speckit.tasks)

**High-level phases**:

1. **Phase 2.1: Complete Existing Implementation**
   - Verify all existing code works correctly
   - Add missing error handling
   - Ensure state persistence works across sessions

2. **Phase 2.2: Analytics Integration**
   - Add checklist_opened event to ChecklistModal
   - Add checklist_completed event to completion API
   - Ensure PII scrubbing via DataScrubber

3. **Phase 2.3: Playbook Export Integration**
   - Locate main Playbook export endpoint
   - Integrate checklist export data
   - Test end-to-end export flow

4. **Phase 2.4: Test Coverage**
   - Unit tests for domain entities
   - Unit tests for use cases
   - Integration tests for API endpoints
   - E2E tests for user flows
   - Achieve ≥80% coverage

5. **Phase 2.5: Documentation & Polish**
   - Update API documentation
   - Add JSDoc comments
   - Update quickstart guide
   - Performance testing

## Implementation Notes

### Existing Implementation Status

**Already Complete**:
- Database schema (checklist_templates, checklist_completions) with RLS policies
- API endpoints (GET /api/checklist, POST /api/checklist/complete, GET /api/checklist/export)
- UI component (ChecklistModal) with optimistic updates
- Integration with EvaluationResultDisplay (opens modal from category chips)
- Progress indicators and empty states

**Needs Completion**:
- Analytics events (checklist_opened fires when modal opens and items load, checklist_completed on toggle)
- Playbook export integration (verify main export endpoint includes checklist data)
- Comprehensive test coverage
- Error handling improvements (toast notifications with retry option)
- Rate limiting (10 requests per minute per user for completion toggles)
- Loading states (skeleton loaders while fetching)
- Category mismatch handling (show closest match, log mismatch)

### Architecture Decisions

1. **Feature Module Location**: Checklist will be organized under `src/features/scheduling/checklist/` since it's closely tied to evaluation results.

2. **Domain Layer**: Create pure domain entities (ChecklistTemplate, ChecklistCompletion) that are framework-independent.

3. **Repository Pattern**: Use repository interfaces in domain layer, implement in infrastructure layer.

4. **Analytics**: All analytics events must pass through DataScrubber to remove PII before sending to PostHog.

5. **Error Handling**: Use optimistic UI updates with rollback on error. Show toast notifications with retry option for failed operations.
6. **Loading States**: Display skeleton loaders (animated placeholders) in the modal while checklist items are being fetched.
7. **Rate Limiting**: Implement rate limiting for checklist completion toggles (10 requests per minute per user) to prevent abuse. When rate limit is exceeded, return 429 status with Retry-After header and structured JSON error response (see FR-013 specification for full response format).
8. **Category Mismatch Handling**: When template categories don't match evaluation categories, show templates for closest matching category using the algorithm defined in FR-016 (exact match → prefix match → Levenshtein distance with threshold 3 → empty state). Log mismatches to Sentry with structured JSON format (see FR-016 specification) for administrator review.

### Risk Mitigation

1. **Playbook Export Integration**: Risk that main export endpoint doesn't exist or uses different pattern. Mitigation: Research existing export patterns first.

2. **Concurrent Updates**: Risk of race conditions when multiple tabs update checklist. Mitigation: Use last-write-wins strategy with proper error handling.

3. **Performance**: Risk of slow checklist loading with many items. Mitigation: Implement pagination or lazy loading if needed.

4. **Test Coverage**: Risk of missing edge cases. Mitigation: Comprehensive test plan covering all acceptance scenarios and edge cases.

## Next Steps

1. ✅ Generate research.md (Phase 0) - Complete
2. ✅ Generate data-model.md, contracts/, quickstart.md (Phase 1) - Complete
3. ✅ Run update-agent-context.sh to update agent context files - Complete
4. Generate tasks.md using /speckit.tasks
5. Begin implementation following tasks.md

**Status**: Plan updated with clarifications from spec. All Phase 0 and Phase 1 artifacts are complete and reflect the clarified requirements.
