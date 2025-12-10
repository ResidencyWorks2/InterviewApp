# Implementation Plan: Confidence Cues & Analytics Events

**Branch**: `001-confidence-cues-analytics` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-confidence-cues-analytics/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Confidence Cues & Analytics Events implements privacy and trust indicators (privacy copy and PD badge) on dashboard and drill pages, and adds four analytics events (`specialty_cue_hit`, `checklist_opened`, `checklist_completed`, `pd_verify_clicked`) to track user interactions. The feature enhances user trust through visible privacy indicators while providing insights into specialty selection patterns, checklist engagement, and privacy badge interactions.

**Technical Approach**: Leverage existing Onion Architecture with feature module pattern. Add privacy UI components to presentation layer, integrate analytics tracking using existing PostHogAnalyticsService with PII scrubbing, and ensure all events pass through DataScrubber and AnalyticsValidator. Follow Next.js 16 patterns for client components and use existing checklist modal and specialty display infrastructure.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode)
**Primary Dependencies**: Next.js 16.0.7, React 19.2.1, PostHog, Radix UI, Tailwind CSS 4.x
**Storage**: N/A (analytics events transmitted to PostHog, not stored in database)
**Testing**: Vitest (unit/integration), Playwright (e2e)
**Target Platform**: Web (Next.js App Router, server and client components)
**Project Type**: Web application (Next.js monorepo)
**Performance Goals**:
- Privacy indicators visible within 2 seconds of page load (SC-001)
- Analytics event tracking adds <50ms latency (non-blocking)
- Privacy copy and PD badge render without layout shift (CLS <0.05)
**Constraints**:
- Must maintain Onion Architecture boundaries
- Must use existing PostHogAnalyticsService infrastructure
- Must scrub all PII from analytics events via DataScrubber
- Must validate events via AnalyticsValidator
- Must handle analytics failures gracefully (non-blocking)
- Must follow Next.js 16 patterns (async params, proxy.ts, server components)
- Privacy copy must be concise and non-intrusive
**Scale/Scope**:
- Supports all authenticated and anonymous users
- Analytics events tracked for all user interactions
- Privacy indicators visible on dashboard and drill pages
- Expected: 1000+ concurrent users, 10k+ analytics events/day

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
- [x] Privacy indicator visibility targets defined (2s page load)
- [x] Analytics tracking latency targets defined (<50ms, non-blocking)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified
- [x] Supabase for auth/storage/DB planned
- [x] Vercel for deployment planned
- [x] PostHog for analytics planned
- [x] Sentry for error tracking planned

## Project Structure

### Documentation (this feature)

```
specs/001-confidence-cues-analytics/
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
├── components/                          # React components
│   ├── privacy/                          # NEW: Privacy components
│   │   ├── PrivacyCopy.tsx              # Privacy text display component
│   │   └── PrivacyDataBadge.tsx         # PD badge component
│   └── drill/                            # EXISTING: Drill components
│       ├── ChecklistModal.tsx           # EXISTING: Add analytics tracking
│       └── EvaluationResultDisplay.tsx # EXISTING: Uses ChecklistModal
├── app/                                  # Next.js App Router
│   └── (dashboard)/                     # Dashboard routes
│       ├── layout.tsx                   # EXISTING: Add privacy components
│       ├── dashboard/page.tsx          # EXISTING: Add privacy components
│       └── drill/[id]/page.tsx         # EXISTING: Add privacy components + specialty tracking
├── features/                             # Feature modules (vertical slices)
│   └── notifications/                    # EXISTING: Analytics feature module
│       ├── application/                  # Analytics use cases
│       │   └── analytics.ts             # EXISTING: Add new event constants
│       └── infrastructure/              # Analytics adapters
│           └── posthog/                  # PostHog adapter
│               └── AnalyticsService.ts  # EXISTING: Uses DataScrubber
└── shared/                               # Shared utilities
    └── security/                         # EXISTING: Security utilities
        ├── data-scrubber.ts             # EXISTING: PII scrubbing
        └── analytics-validator.ts      # EXISTING: Event validation

tests/
├── unit/                                 # Unit tests
│   ├── components/                       # NEW: Component tests
│   │   ├── privacy/                     # Privacy component tests
│   │   │   ├── PrivacyCopy.test.tsx
│   │   │   └── PrivacyDataBadge.test.tsx
│   │   └── drill/                       # EXISTING: ChecklistModal tests
│   │       └── ChecklistModal.test.tsx # Update with analytics tests
│   └── features/                         # Feature tests
│       └── notifications/                 # Analytics tests
│           └── analytics-events.test.ts # NEW: Event tracking tests
├── integration/                          # Integration tests
│   └── analytics/                       # NEW: Analytics integration tests
│       ├── specialty-tracking.test.ts   # Specialty event tracking
│       ├── checklist-tracking.test.ts   # Checklist event tracking
│       └── privacy-badge-tracking.test.ts # PD badge event tracking
└── e2e/                                  # E2E tests
    └── confidence-cues/                  # NEW: E2E tests
        ├── privacy-indicators.spec.ts    # Privacy copy and badge visibility
        └── analytics-events.spec.ts     # Analytics event tracking
```

**Structure Decision**: Web application structure following existing Onion Architecture pattern. Privacy components added to `src/components/privacy/` as reusable UI components. Analytics tracking integrated into existing `features/notifications` module. No database changes required as analytics events are transmitted to PostHog only. Tests organized by layer (unit/integration/e2e) following existing patterns.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
