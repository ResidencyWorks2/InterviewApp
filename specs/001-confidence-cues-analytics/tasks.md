# Tasks: Confidence Cues & Analytics Events

**Input**: Design documents from `/specs/001-confidence-cues-analytics/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included following TDD approach as specified in the constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `src/`, `tests/` at repository root
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

**Note**: Most infrastructure already exists. This phase focuses on verifying prerequisites and adding event constants.

- [ ] T001 Verify existing analytics infrastructure (PostHogAnalyticsService) in `src/features/notifications/infrastructure/posthog/AnalyticsService.ts`
- [ ] T002 Verify existing data scrubbing utilities (DataScrubber, AnalyticsValidator) in `src/shared/security/`
- [ ] T003 [P] Add analytics event constants to `src/features/notifications/application/analytics.ts`: `SPECIALTY_CUE_HIT`, `CHECKLIST_OPENED`, `CHECKLIST_COMPLETED`, `PD_VERIFY_CLICKED`
- [ ] T004 [P] Verify existing checklist modal component in `src/components/drill/ChecklistModal.tsx`
- [ ] T005 [P] Verify existing specialty display in `src/app/(dashboard)/drill/[id]/page.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Note**: Most foundational infrastructure already exists. This phase verifies readiness.

- [ ] T006 Verify PostHog configuration and API keys are set in environment variables
- [ ] T007 Verify DataScrubber and AnalyticsValidator are properly configured and tested
- [ ] T008 Verify authentication system provides anonymized user IDs for analytics

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Privacy and Trust Indicators (Priority: P1) 🎯 MVP

**Goal**: Users see visible privacy and data protection information (privacy copy and PD badge) on dashboard and drill pages to build confidence in the application's commitment to protecting their personal information.

**Independent Test**: Navigate to dashboard and drill pages, verify privacy copy is visible and PD badge is accessible and clickable. Click PD badge and verify navigation to `/privacy` route.

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [P] [US1] Unit test for PrivacyCopy component in `tests/unit/components/privacy/PrivacyCopy.test.tsx` - test rendering, text display, responsive design
- [ ] T010 [P] [US1] Unit test for PrivacyDataBadge component in `tests/unit/components/privacy/PrivacyDataBadge.test.tsx` - test rendering, click handling, link navigation, accessibility
- [ ] T011 [P] [US1] E2E test for privacy indicators visibility in `tests/e2e/confidence-cues/privacy-indicators.spec.ts` - test visibility on dashboard and drill pages, click behavior, navigation

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create PrivacyCopy component in `src/components/privacy/PrivacyCopy.tsx` - display 2-3 lines of generic trust-building text, responsive design, accessible
- [ ] T013 [P] [US1] Create PrivacyDataBadge component in `src/components/privacy/PrivacyDataBadge.tsx` - shield icon with "Privacy" text, clickable link to `/privacy` route with fallback, accessible, track `pd_verify_clicked` event on click
- [ ] T014 [US1] Add privacy components to dashboard layout in `src/app/(dashboard)/layout.tsx` - add PrivacyCopy and PrivacyDataBadge to footer section
- [ ] T015 [US1] Add privacy components to drill page in `src/app/(dashboard)/drill/[id]/page.tsx` - add PrivacyCopy and PrivacyDataBadge to footer or dedicated section
- [ ] T016 [US1] Create `/privacy` route page in `src/app/privacy/page.tsx` (if route doesn't exist) - basic privacy information page with fallback handling

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Privacy copy and PD badge visible on dashboard and drill pages, badge clickable and navigates correctly.

---

## Phase 4: User Story 2 - Specialty Selection Analytics (Priority: P2)

**Goal**: System tracks `specialty_cue_hit` analytics event when specialty badge is displayed on drill page to understand specialty targeting usage and improve question recommendations.

**Independent Test**: Navigate to drill page with specialty badge displayed, verify `specialty_cue_hit` event fires once per page view with correct properties (user_id, drill_id, specialty, timestamp) in PostHog. Verify event contains no PII.

### Tests for User Story 2

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T017 [P] [US2] Unit test for specialty event tracking in `tests/unit/features/notifications/analytics-events.test.ts` - test `specialty_cue_hit` event structure, properties, PII scrubbing
- [ ] T018 [P] [US2] Integration test for specialty tracking in `tests/integration/analytics/specialty-tracking.test.ts` - test event fires on page load/view, once per page view, correct properties, PostHog transmission
- [ ] T019 [P] [US2] E2E test for specialty analytics in `tests/e2e/confidence-cues/analytics-events.spec.ts` - test event firing on drill page with specialty, verify in PostHog

### Implementation for User Story 2

- [ ] T020 [US2] Add `specialty_cue_hit` event tracking to drill page in `src/app/(dashboard)/drill/[id]/page.tsx` - fire event when specialty badge is displayed on page load/view (once per page view), include anonymized user_id, drill_id, specialty name, timestamp
- [ ] T021 [US2] Add error handling for specialty tracking in `src/app/(dashboard)/drill/[id]/page.tsx` - gracefully handle missing specialty field, null/undefined specialty, analytics service failures (non-blocking)

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently. Specialty events fire correctly on drill page load with specialty badge.

---

## Phase 5: User Story 3 - Checklist Interaction Analytics (Priority: P2)

**Goal**: System tracks `checklist_opened` and `checklist_completed` analytics events to understand coaching effectiveness and identify which categories users engage with most.

**Independent Test**: Open checklist modal for a category, verify `checklist_opened` event fires. Complete all items in category, verify `checklist_completed` event fires immediately when toggle results in 100% completion. Verify events contain no PII.

### Tests for User Story 3

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T022 [P] [US3] Unit test for checklist event tracking in `tests/unit/features/notifications/analytics-events.test.ts` - test `checklist_opened` and `checklist_completed` event structures, properties, PII scrubbing
- [ ] T023 [P] [US3] Update unit test for ChecklistModal in `tests/unit/components/drill/ChecklistModal.test.tsx` - add tests for analytics event tracking on modal open and completion
- [ ] T024 [P] [US3] Integration test for checklist tracking in `tests/integration/analytics/checklist-tracking.test.ts` - test `checklist_opened` fires on modal open, `checklist_completed` fires on 100% completion, correct properties, PostHog transmission
- [ ] T025 [P] [US3] E2E test for checklist analytics in `tests/e2e/confidence-cues/analytics-events.spec.ts` - test events fire correctly, verify in PostHog

### Implementation for User Story 3

- [ ] T026 [US3] Add `checklist_opened` event tracking to ChecklistModal in `src/components/drill/ChecklistModal.tsx` - fire event when modal opens (open prop changes to true), include anonymized user_id, evaluation_id, category, timestamp
- [ ] T027 [US3] Add `checklist_completed` event tracking to ChecklistModal in `src/components/drill/ChecklistModal.tsx` - fire event immediately when toggle action results in 100% completion (all items checked), include anonymized user_id, evaluation_id, category, completion_count, timestamp
- [ ] T028 [US3] Add error handling for checklist tracking in `src/components/drill/ChecklistModal.tsx` - gracefully handle analytics service failures (non-blocking), ensure events don't block user interactions

**Checkpoint**: At this point, User Story 3 should be fully functional and testable independently. Checklist events fire correctly on modal open and completion.

---

## Phase 6: User Story 4 - Privacy Badge Interaction Analytics (Priority: P3)

**Goal**: System tracks `pd_verify_clicked` analytics event when PD badge is clicked to understand user interest in privacy information and compliance verification.

**Independent Test**: Click PD badge, verify `pd_verify_clicked` event fires with anonymized user_id and timestamp in PostHog. Verify event contains no PII.

**Note**: This story builds on User Story 1 (PD badge component). The badge component is created in US1, but analytics tracking is added here.

### Tests for User Story 4

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T029 [P] [US4] Unit test for PD badge click event tracking in `tests/unit/components/privacy/PrivacyDataBadge.test.tsx` - update existing test to verify `pd_verify_clicked` event fires on click
- [ ] T030 [P] [US4] Integration test for privacy badge tracking in `tests/integration/analytics/privacy-badge-tracking.test.ts` - test event fires on badge click, correct properties, PostHog transmission
- [ ] T031 [P] [US4] E2E test for PD badge analytics in `tests/e2e/confidence-cues/analytics-events.spec.ts` - test event firing on badge click, verify in PostHog

### Implementation for User Story 4

- [ ] T032 [US4] Add `pd_verify_clicked` event tracking to PrivacyDataBadge in `src/components/privacy/PrivacyDataBadge.tsx` - fire event on badge click (before navigation), include anonymized user_id, timestamp
- [ ] T033 [US4] Add error handling for PD badge tracking in `src/components/privacy/PrivacyDataBadge.tsx` - gracefully handle analytics service failures (non-blocking), ensure event doesn't block navigation

**Checkpoint**: At this point, User Story 4 should be fully functional and testable independently. PD badge click events fire correctly.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T034 [P] Verify all analytics events pass PII scrubbing validation - run validation tests, check PostHog events contain no PII
- [ ] T035 [P] Verify analytics tracking failures don't block user interactions - test with PostHog disabled, verify graceful degradation
- [ ] T036 [P] Verify privacy indicators are accessible and functional on mobile, tablet, and desktop viewports - responsive design testing
- [ ] T037 [P] Update documentation in `README.md` if needed - document privacy indicators and analytics events
- [ ] T038 [P] Run quickstart.md validation - verify all implementation steps from quickstart.md are complete
- [ ] T039 Code cleanup and refactoring - ensure all code follows Onion Architecture boundaries, Biome formatting
- [ ] T040 [P] Performance validation - verify privacy indicators visible within 2 seconds (SC-001), analytics tracking adds <50ms latency
- [ ] T041 [P] Security validation - verify 100% of analytics events pass PII scrubbing (SC-006), verify no PII in PostHog events

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - No dependencies on other stories
  - User Story 3 (P2): Can start after Foundational - No dependencies on other stories
  - User Story 4 (P3): Depends on User Story 1 (uses PD badge component from US1)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (can run in parallel with US1)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (can run in parallel with US1, US2)
- **User Story 4 (P3)**: Depends on User Story 1 completion (uses PrivacyDataBadge component created in US1)

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Components before integration
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004, T005)
- All Foundational tasks can run in parallel (T006, T007, T008)
- Once Foundational phase completes:
  - User Story 1, User Story 2, and User Story 3 can start in parallel (if team capacity allows)
  - User Story 4 must wait for User Story 1 completion
- All tests for a user story marked [P] can run in parallel
- Components within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for PrivacyCopy component in tests/unit/components/privacy/PrivacyCopy.test.tsx"
Task: "Unit test for PrivacyDataBadge component in tests/unit/components/privacy/PrivacyDataBadge.test.tsx"
Task: "E2E test for privacy indicators visibility in tests/e2e/confidence-cues/privacy-indicators.spec.ts"

# Launch all components for User Story 1 together:
Task: "Create PrivacyCopy component in src/components/privacy/PrivacyCopy.tsx"
Task: "Create PrivacyDataBadge component in src/components/privacy/PrivacyDataBadge.tsx"
```

---

## Parallel Example: User Story 2 and User Story 3

```bash
# Once Foundational phase completes, User Story 2 and User Story 3 can run in parallel:

# Developer A: User Story 2
Task: "Add specialty_cue_hit event tracking to drill page in src/app/(dashboard)/drill/[id]/page.tsx"

# Developer B: User Story 3
Task: "Add checklist_opened event tracking to ChecklistModal in src/components/drill/ChecklistModal.tsx"
Task: "Add checklist_completed event tracking to ChecklistModal in src/components/drill/ChecklistModal.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Privacy and Trust Indicators)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1) - Privacy Indicators
   - Developer B: User Story 2 (P2) - Specialty Analytics (parallel with US1)
   - Developer C: User Story 3 (P2) - Checklist Analytics (parallel with US1, US2)
3. After User Story 1 completes:
   - Developer D: User Story 4 (P3) - PD Badge Analytics (depends on US1)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All analytics events must pass through DataScrubber and AnalyticsValidator
- Analytics tracking failures must not block user interactions (non-blocking pattern)

---

## Task Summary

**Total Tasks**: 41

**Tasks by Phase**:
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 3 tasks
- Phase 3 (User Story 1): 8 tasks (3 tests + 5 implementation)
- Phase 4 (User Story 2): 5 tasks (3 tests + 2 implementation)
- Phase 5 (User Story 3): 7 tasks (4 tests + 3 implementation)
- Phase 6 (User Story 4): 5 tasks (3 tests + 2 implementation)
- Phase 7 (Polish): 8 tasks

**Parallel Opportunities**: 15 tasks marked [P] can run in parallel

**Independent Test Criteria**:
- User Story 1: Privacy copy and PD badge visible and clickable on dashboard/drill pages
- User Story 2: `specialty_cue_hit` event fires on drill page with specialty badge
- User Story 3: `checklist_opened` and `checklist_completed` events fire correctly
- User Story 4: `pd_verify_clicked` event fires on PD badge click

**Suggested MVP Scope**: User Story 1 only (Privacy and Trust Indicators) - delivers immediate user value and trust signals
