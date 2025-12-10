# Research: Micro-Checklists

**Date**: 2025-01-27
**Feature**: Micro-Checklists
**Status**: Complete

## Research Tasks & Decisions

### 1. Playbook Export Integration Pattern

**Research Question**: How is the main Playbook export currently implemented? Should checklist export be a separate endpoint or integrated into main export?

**Findings**:
- Checklist export endpoint exists at `/api/checklist/export` and returns formatted markdown text
- Need to locate main Playbook export endpoint to understand integration pattern
- Export endpoint already formats checklist data with categories, completed items, and delivery notes

**Decision**:
- Keep checklist export as a separate endpoint for modularity
- Integrate checklist data into main Playbook export by calling the checklist export endpoint and including the formatted text
- This maintains separation of concerns while enabling composition

**Rationale**:
- Modular design allows checklist export to be used independently
- Main Playbook export can compose multiple export sources (evaluation results, checklist items, etc.)
- Easier to test and maintain

**Alternatives Considered**:
- Single unified export endpoint: Rejected because it would create tight coupling
- Database-level joins: Rejected because it violates separation of concerns

---

### 2. PostHog Analytics Event Patterns

**Research Question**: How are analytics events currently structured in InterviewApp? What should the event payload structure be for checklist_opened and checklist_completed?

**Findings**:
- Analytics events use `PostHogAnalyticsService.track()` method
- All events must pass through `DataScrubber.scrubObject()` to remove PII
- Events include: eventName, properties (scrubbed), userId (anonymized), timestamp
- Existing pattern: `track(eventName, properties, userId)` where properties are scrubbed before transmission
- Events are validated via `AnalyticsValidator.validateEvent()`

**Decision**:
- Use `PostHogAnalyticsService.track()` for both events
- Event names: `checklist_opened`, `checklist_completed`
- Event properties structure:
  ```typescript
  {
    category: string,           // e.g., "Communication", "Problem Solving"
    evaluationId: string,       // UUID of evaluation
    itemCount?: number,          // Total items in checklist (for opened)
    completedCount?: number,    // Number of completed items (for opened)
    templateId?: string,        // UUID of checklist template (for completed)
    itemText?: string,          // Text of completed item (scrubbed if contains PII)
    timestamp: string           // ISO timestamp
  }
  ```
- All properties must be scrubbed via `DataScrubber.scrubObject()` before tracking
- Use anonymized userId from auth context

**Rationale**:
- Follows existing analytics patterns in the codebase
- Ensures PII scrubbing compliance
- Provides useful metrics without exposing sensitive data

**Alternatives Considered**:
- Custom analytics client: Rejected because it duplicates existing infrastructure
- Direct PostHog calls: Rejected because it bypasses PII scrubbing

---

### 3. Optimistic UI Update Patterns

**Research Question**: How are optimistic updates currently handled in the codebase? What's the error handling and rollback strategy?

**Findings**:
- `ChecklistModal` already implements optimistic updates:
  - UI updates immediately when user clicks item
  - API call made in background
  - On error, UI reverts to previous state
- Pattern: Update state → Call API → On error, revert state and show error message
- Error handling uses try-catch with user-friendly error messages

**Decision**:
- Continue using existing optimistic update pattern in ChecklistModal
- Enhance error handling:
  - Show toast notification on error with retry option
  - Log error to Sentry (with scrubbed context)
  - Provide retry option for failed updates
- Ensure error messages are user-friendly and actionable
- Use toast notifications (not inline messages) for error display

**Rationale**:
- Existing pattern works well and provides good UX
- Enhancements improve error recovery without changing core pattern

**Alternatives Considered**:
- Pessimistic updates (wait for API): Rejected because it degrades UX
- Queue-based updates: Rejected because it adds unnecessary complexity

---

### 4. Next.js 16 Server Component Patterns

**Research Question**: Best practices for server components vs client components for checklist features. Which parts should be server vs client components?

**Findings**:
- Next.js 16 uses App Router with server components by default
- Client components marked with `"use client"` directive
- Route handlers (API routes) are server-side
- Interactive UI components (modals, buttons) must be client components
- Data fetching can be done in server components or API routes

**Decision**:
- **Server Components**:
  - API route handlers (`/api/checklist/*`)
  - Data fetching logic
- **Client Components**:
  - `ChecklistModal` (interactive UI with state)
  - `EvaluationResultDisplay` (uses ChecklistModal)
- **Hybrid Approach**:
  - Server components fetch initial data
  - Client components handle user interactions
  - API routes handle state mutations

**Rationale**:
- Follows Next.js 16 best practices
- Maximizes server-side rendering benefits
- Client components only where interactivity is needed

**Alternatives Considered**:
- All client-side: Rejected because it loses SSR benefits
- All server-side: Rejected because modals require client-side interactivity

---

## Technology Choices

### Database
- **Choice**: Supabase PostgreSQL (existing)
- **Rationale**: Already in use, provides RLS policies, type generation

### Analytics
- **Choice**: PostHog via `PostHogAnalyticsService` (existing)
- **Rationale**: Already integrated, has PII scrubbing, follows compliance requirements

### UI Components
- **Choice**: Radix UI Dialog for modal (existing)
- **Rationale**: Already in use, accessible, follows design system

### State Management
- **Choice**: React useState with optimistic updates (existing)
- **Rationale**: Simple, sufficient for checklist state, no need for complex state management

---

## Integration Points

### Existing Systems
1. **Evaluation Results**: Checklist is accessed from evaluation category chips
2. **Authentication**: Uses Supabase Auth for user identification
3. **Database**: Uses existing checklist_templates and checklist_completions tables
4. **Analytics**: Integrates with PostHog via AnalyticsService
5. **Error Tracking**: Integrates with Sentry for error monitoring

### New Integrations Needed
1. **Playbook Export**: Integrate checklist export into main Playbook export endpoint
2. **Analytics Events**: Add checklist_opened and checklist_completed events

---

## Performance Considerations

### Checklist Loading
- **Target**: 2 seconds (SC-001)
- **Strategy**:
  - Fetch templates and completions in parallel
  - Use database indexes (already exist)
  - Cache templates if needed (future optimization)

### UI Responsiveness
- **Target**: 500ms visual feedback (SC-002)
- **Strategy**: Optimistic UI updates provide immediate feedback

### Export Performance
- **Target**: 5 seconds (SC-006)
- **Strategy**:
  - Efficient database queries with proper indexes
  - Format text in memory (no file I/O)
  - Return formatted text directly

---

## Security Considerations

### PII Scrubbing
- All analytics events must pass through `DataScrubber.scrubObject()`
- Checklist item text may contain user input (transcript snippets) - must be scrubbed
- User IDs must be anonymized in analytics

### Row Level Security
- RLS policies already exist for checklist_completions (users can only access their own)
- RLS policies exist for checklist_templates (read-only for authenticated users)

### Authentication
- All API endpoints require authentication
- User context obtained from Supabase Auth

---

## Testing Strategy

### Unit Tests
- Domain entities (ChecklistTemplate, ChecklistCompletion)
- Use cases (GetChecklistUseCase, ToggleCompletionUseCase)
- Validation logic

### Integration Tests
- API endpoint tests (GET /api/checklist, POST /api/checklist/complete, GET /api/checklist/export)
- Database operations
- Analytics event tracking

### E2E Tests
- Full user flow: Open checklist → Complete items → Export Playbook
- Error scenarios: Network failures, authentication errors

---

## Open Questions Resolved

1. ✅ **Playbook Export Integration**: Separate endpoint with composition pattern
2. ✅ **Analytics Events**: Use existing PostHogAnalyticsService with PII scrubbing
3. ✅ **Optimistic Updates**: Continue existing pattern with enhanced error handling
4. ✅ **Component Architecture**: Server components for data, client components for UI

## Remaining Risks

1. **Playbook Export Endpoint**: Need to locate and verify main Playbook export endpoint exists
   - **Mitigation**: Search codebase for "playbook" or "export" endpoints
   - **Impact**: Low - checklist export can work independently

2. **Concurrent Updates**: Multiple tabs updating same checklist
   - **Mitigation**: Last-write-wins strategy with proper error handling
   - **Impact**: Low - rare scenario, acceptable behavior

---

## Next Steps

1. Generate data-model.md with entity definitions
2. Generate contracts/api-specification.md with API contracts
3. Generate quickstart.md with user guide
4. Update agent context files
5. Generate tasks.md for implementation
