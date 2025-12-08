# Tasks: Micro-Checklists

**Input**: Design documents from `/specs/001-micro-checklists/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as this is a critical feature requiring comprehensive coverage per constitution requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project structure per plan.md

---

## Phase 1: Setup (Verification & Dependencies)

**Purpose**: Verify existing implementation and check dependencies

- [ ] T001 Verify database schema exists: `supabase/migrations/20251206010000_create_checklist_tables.sql`
- [ ] T002 Verify database types are generated: `src/types/database.ts` contains `checklist_templates` and `checklist_completions` types
- [ ] T003 [P] Verify API endpoints exist: `src/app/api/checklist/route.ts`, `src/app/api/checklist/complete/route.ts`, `src/app/api/checklist/export/route.ts`
- [ ] T004 [P] Verify UI component exists: `src/components/drill/ChecklistModal.tsx`
- [ ] T005 [P] Verify integration exists: `src/components/drill/EvaluationResultDisplay.tsx` opens ChecklistModal
- [ ] T006 Verify Supabase client configuration: `src/infrastructure/supabase/server.ts` and `src/infrastructure/supabase/client.ts`
- [ ] T007 [P] Verify analytics service exists: `src/features/notifications/infrastructure/posthog/AnalyticsService.ts`
- [ ] T008 [P] Verify DataScrubber exists: `src/shared/security/data-scrubber.ts`
- [ ] T009 [P] Verify rate limiting infrastructure exists: `src/presentation/api/api-proxy.ts` with `createRateLimitProxy`
- [ ] T010 [P] Verify skeleton component exists: `src/components/ui/skeleton.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Verify authentication system is operational for checklist endpoints
- [ ] T012 [P] Verify PostHog analytics is configured and accessible
- [ ] T013 [P] Verify Sentry error tracking is configured
- [ ] T014 Verify database RLS policies are correctly configured for checklist tables
- [ ] T015 Run `pnpm run update-types` to ensure database types are current

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Access Coaching Checklists from Evaluation Results (Priority: P1) 🎯 MVP

**Goal**: Users can access category-specific coaching checklists by clicking on evaluation category chips. The checklist modal displays actionable coaching tips with skeleton loaders during fetch and fires analytics events.

**Independent Test**: Click any category chip in evaluation results, verify modal opens with correct category's checklist items, confirm skeleton loaders appear during fetch, verify analytics event fires when items load.

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T016 [P] [US1] Unit test for ChecklistModal component skeleton loader display in `tests/unit/checklist/ChecklistModal.test.tsx`
- [ ] T017 [P] [US1] Integration test for GET /api/checklist endpoint in `tests/integration/checklist/checklist-api.test.ts`
- [ ] T018 [P] [US1] Integration test for checklist_opened analytics event in `tests/integration/checklist/checklist-analytics.test.ts`
- [ ] T019 [P] [US1] E2E test for opening checklist modal from category chip in `tests/e2e/checklist/checklist-flow.spec.ts`

### Implementation for User Story 1

- [ ] T020 [US1] Enhance ChecklistModal to display skeleton loaders while fetching in `src/components/drill/ChecklistModal.tsx`
- [ ] T021 [US1] Add checklist_opened analytics event when modal opens and items load successfully in `src/components/drill/ChecklistModal.tsx`
- [ ] T022 [US1] Ensure analytics event properties are scrubbed via DataScrubber in `src/components/drill/ChecklistModal.tsx`
- [ ] T023 [US1] Verify category mismatch handling shows closest matching category in `src/app/api/checklist/route.ts`
- [ ] T024 [US1] Add logging for category mismatches in `src/app/api/checklist/route.ts`
- [ ] T025 [US1] Verify empty state displays correctly when no checklist items exist in `src/components/drill/ChecklistModal.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can open checklists, see skeleton loaders, and analytics events fire correctly.

---

## Phase 4: User Story 2 - Track Practice Progress with Checklist Items (Priority: P1)

**Goal**: Users can check off checklist items with immediate visual feedback, progress tracking, and persistent state. Errors are handled with toast notifications and retry options. Rate limiting prevents abuse.

**Independent Test**: Check/uncheck items in modal, verify UI updates immediately, confirm state persists after closing/reopening modal, verify progress indicators update, test error handling with toast notifications, verify rate limiting works.

### Tests for User Story 2

- [ ] T026 [P] [US2] Unit test for ToggleCompletionUseCase in `tests/unit/checklist/ToggleCompletionUseCase.test.ts`
- [ ] T027 [P] [US2] Integration test for POST /api/checklist/complete endpoint in `tests/integration/checklist/checklist-api.test.ts`
- [ ] T028 [P] [US2] Integration test for rate limiting on completion endpoint in `tests/integration/checklist/checklist-rate-limit.test.ts`
- [ ] T029 [P] [US2] Integration test for checklist_completed analytics event in `tests/integration/checklist/checklist-analytics.test.ts`
- [ ] T030 [P] [US2] E2E test for checking/unchecking items with error handling in `tests/e2e/checklist/checklist-flow.spec.ts`

### Implementation for User Story 2

- [ ] T031 [US2] Implement rate limiting for POST /api/checklist/complete (10 requests per minute per user) in `src/app/api/checklist/complete/route.ts`
- [ ] T032 [US2] Add rate limit response with retry-after header when limit exceeded in `src/app/api/checklist/complete/route.ts`
- [ ] T033 [US2] Add checklist_completed analytics event when item is completed in `src/app/api/checklist/complete/route.ts`
- [ ] T034 [US2] Ensure analytics event properties are scrubbed via DataScrubber in `src/app/api/checklist/complete/route.ts`
- [ ] T035 [US2] Add toast notification component or verify existing toast system in `src/components/ui/` (create if needed)
- [ ] T036 [US2] Enhance ChecklistModal error handling to show toast notifications with retry option in `src/components/drill/ChecklistModal.tsx`
- [ ] T037 [US2] Verify optimistic UI updates revert correctly on error in `src/components/drill/ChecklistModal.tsx`
- [ ] T038 [US2] Verify progress indicators update correctly when items are checked/unchecked in `src/components/drill/ChecklistModal.tsx`
- [ ] T039 [US2] Verify state persists correctly across modal close/reopen in `src/components/drill/ChecklistModal.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can track progress, see errors with retry options, and rate limiting prevents abuse.

---

## Phase 5: User Story 3 - Include Completed Checklists in Playbook Export (Priority: P2)

**Goal**: When users export their evaluation results to a Playbook document, completed checklist items are included in the export, organized by category.

**Independent Test**: Complete checklist items, export Playbook, verify completed items appear in export document grouped by category with proper formatting.

### Tests for User Story 3

- [ ] T040 [P] [US3] Integration test for GET /api/checklist/export endpoint in `tests/integration/checklist/checklist-export.test.ts`
- [ ] T041 [P] [US3] Integration test for Playbook export including checklist data in `tests/integration/checklist/playbook-export.test.ts`
- [ ] T042 [P] [US3] E2E test for exporting Playbook with completed checklist items in `tests/e2e/checklist/playbook-export.spec.ts`

### Implementation for User Story 3

- [ ] T043 [US3] Locate main Playbook export endpoint (search for "playbook" or "export" in `src/app/api/`)
- [ ] T044 [US3] Integrate checklist export into main Playbook export endpoint by calling `/api/checklist/export` and including formatted text
- [ ] T045 [US3] Verify checklist export appears correctly in Playbook document format
- [ ] T046 [US3] Handle case when no checklist items are completed (omit section or show message) in Playbook export
- [ ] T047 [US3] Verify export performance meets target (< 5 seconds) per SC-006

**Checkpoint**: At this point, all user stories should now be independently functional. Users can export Playbooks with completed checklist items.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, edge cases, and comprehensive testing

### Edge Cases & Error Handling

- [ ] T048 [P] Handle network failures when saving checklist state (revert optimistic update, show toast) in `src/components/drill/ChecklistModal.tsx`
- [ ] T049 [P] Handle authentication expiration during checklist interaction (prompt re-authentication) in `src/app/api/checklist/route.ts` and `src/app/api/checklist/complete/route.ts`
- [ ] T050 [P] Handle concurrent checklist updates from multiple browser tabs (last-write-wins strategy) in `src/app/api/checklist/complete/route.ts`
- [ ] T051 [P] Handle very long checklist item text (text wrapping, modal scrolling) in `src/components/drill/ChecklistModal.tsx`
- [ ] T052 [P] Handle deactivated checklist templates (completed items still appear in history) in `src/app/api/checklist/route.ts` and `src/app/api/checklist/export/route.ts`

### Comprehensive Testing

- [ ] T053 [P] Unit tests for domain entities (ChecklistTemplate, ChecklistCompletion) in `tests/unit/checklist/ChecklistTemplate.test.ts` and `tests/unit/checklist/ChecklistCompletion.test.ts`
- [ ] T054 [P] Unit tests for GetChecklistUseCase in `tests/unit/checklist/GetChecklistUseCase.test.ts`
- [ ] T055 [P] Unit tests for ExportChecklistUseCase in `tests/unit/checklist/ExportChecklistUseCase.test.ts`
- [ ] T056 [P] Integration tests for all API endpoints with error scenarios in `tests/integration/checklist/checklist-api.test.ts`
- [ ] T057 [P] E2E tests for complete user flows covering all acceptance scenarios in `tests/e2e/checklist/checklist-flow.spec.ts`
- [ ] T058 Verify test coverage meets ≥80% target for unit + integration tests

### Documentation & Code Quality

- [ ] T059 [P] Add JSDoc comments to all exported functions in checklist API routes
- [ ] T060 [P] Add JSDoc comments to ChecklistModal component and its props
- [ ] T061 [P] Update API documentation with rate limiting details in `specs/001-micro-checklists/contracts/api-specification.md`
- [ ] T062 [P] Update quickstart guide with new features (skeleton loaders, toast notifications, rate limiting) in `specs/001-micro-checklists/quickstart.md`
- [ ] T063 Run `pnpm lint` and fix any Biome linting issues
- [ ] T064 Run `pnpm lint:boundaries` and verify no dependency boundary violations
- [ ] T065 Run `pnpm typecheck` and fix any TypeScript errors

### Performance & Optimization

- [ ] T066 Verify checklist modal opens within 2 seconds (SC-001) - performance test
- [ ] T067 Verify checklist item state changes reflect in UI within 500ms (SC-002) - performance test
- [ ] T068 Verify Playbook export including checklist items completes in under 5 seconds (SC-006) - performance test
- [ ] T069 Verify responsive design on mobile devices (SC-008) - manual/automated test

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P2)**: Depends on US2 completion (needs completed items to export)

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, US1 and US2 can start in parallel
- All tests for a user story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members (US1 and US2 can be parallel, US3 depends on US2)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for ChecklistModal component skeleton loader display in tests/unit/checklist/ChecklistModal.test.tsx"
Task: "Integration test for GET /api/checklist endpoint in tests/integration/checklist/checklist-api.test.ts"
Task: "Integration test for checklist_opened analytics event in tests/integration/checklist/checklist-analytics.test.ts"
Task: "E2E test for opening checklist modal from category chip in tests/e2e/checklist/checklist-flow.spec.ts"

# Launch implementation tasks that can run in parallel:
Task: "Enhance ChecklistModal to display skeleton loaders while fetching in src/components/drill/ChecklistModal.tsx"
Task: "Verify category mismatch handling shows closest matching category in src/app/api/checklist/route.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for ToggleCompletionUseCase in tests/unit/checklist/ToggleCompletionUseCase.test.ts"
Task: "Integration test for POST /api/checklist/complete endpoint in tests/integration/checklist/checklist-api.test.ts"
Task: "Integration test for rate limiting on completion endpoint in tests/integration/checklist/checklist-rate-limit.test.ts"

# Launch implementation tasks that can run in parallel:
Task: "Implement rate limiting for POST /api/checklist/complete in src/app/api/checklist/complete/route.ts"
Task: "Add toast notification component or verify existing toast system in src/components/ui/"
Task: "Add checklist_completed analytics event when item is completed in src/app/api/checklist/complete/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify existing implementation)
2. Complete Phase 2: Foundational (verify dependencies)
3. Complete Phase 3: User Story 1 (add skeleton loaders, analytics)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add Polish phase → Final testing and documentation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (skeleton loaders, analytics)
   - Developer B: User Story 2 (rate limiting, error handling) - can start in parallel with US1
3. Once US2 is complete:
   - Developer C: User Story 3 (Playbook export integration)
4. All developers: Polish phase (tests, edge cases, documentation)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Since feature is partially implemented, many tasks are "verify and enhance" rather than "create from scratch"
- All analytics events must pass through DataScrubber before transmission
- Rate limiting uses existing infrastructure in `src/presentation/api/api-proxy.ts`
- Skeleton component already exists at `src/components/ui/skeleton.tsx`
- Toast notifications may need to be added if not already present in UI components

---

## Task Summary

**Total Tasks**: 69
- Phase 1 (Setup): 10 tasks
- Phase 2 (Foundational): 5 tasks
- Phase 3 (US1): 10 tasks (4 tests + 6 implementation)
- Phase 4 (US2): 14 tasks (5 tests + 9 implementation)
- Phase 5 (US3): 6 tasks (3 tests + 3 implementation)
- Phase 6 (Polish): 24 tasks (edge cases, tests, documentation, performance)

**Parallel Opportunities**:
- Setup phase: 7 tasks can run in parallel
- Foundational phase: 3 tasks can run in parallel
- US1 and US2 can run in parallel after foundational
- Most test tasks can run in parallel within their story phase

**MVP Scope**: Phases 1-3 (User Story 1 only) = 25 tasks

**Suggested Next Steps**: Begin with Phase 1 Setup tasks to verify existing implementation, then proceed to Phase 2 Foundational, then Phase 3 User Story 1 for MVP delivery.
