# Feature Specification: Micro-Checklists

**Feature Branch**: `001-micro-checklists`
**Created**: 2025-01-27
**Status**: Draft
**Input**: User description: "please implement the following it is partialy implemented so check the existing system"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access Coaching Checklists from Evaluation Results (Priority: P1)

After receiving evaluation feedback, users can access category-specific coaching checklists by clicking on evaluation category chips. The checklist modal displays actionable coaching tips that users can check off as they practice and improve.

**Why this priority**: This is the primary entry point for users to discover and engage with coaching content. Without this, users cannot access the micro-checklist feature at all.

**Independent Test**: Can be fully tested by clicking any category chip in evaluation results, verifying the modal opens with the correct category's checklist items, and confirming items can be checked/unchecked. This delivers immediate value by providing actionable coaching guidance.

**Acceptance Scenarios**:

1. **Given** a user has completed an evaluation and is viewing results, **When** they click on a category chip (e.g., "Communication", "Problem Solving"), **Then** a modal opens displaying checklist items for that category
2. **Given** the checklist modal is open, **When** items are being fetched from the server, **Then** skeleton loaders (animated placeholders) are displayed
3. **Given** the checklist modal is open, **When** the user views the checklist items, **Then** they see coaching tips specific to that category, ordered by display priority
4. **Given** the checklist modal is open, **When** items are already completed from a previous session, **Then** those items are shown as checked with visual indication
5. **Given** the checklist modal is open, **When** the user closes and reopens it, **Then** previously checked items remain checked (state persists)

---

### User Story 2 - Track Practice Progress with Checklist Items (Priority: P1)

Users can check off checklist items as they practice and improve, with their progress visually tracked and persisted across sessions.

**Why this priority**: This is the core value proposition - allowing users to track their practice progress. Without this, the feature is just a static list of tips.

**Independent Test**: Can be fully tested by checking/unchecking items in the modal, verifying the UI updates immediately, confirming the state persists after closing and reopening the modal, and checking that progress indicators update correctly. This delivers value by giving users a sense of accomplishment and clear visibility into their practice progress.

**Acceptance Scenarios**:

1. **Given** a checklist item is unchecked, **When** the user clicks on it, **Then** it becomes checked with visual feedback (green checkmark, strikethrough text)
2. **Given** a checklist item is checked, **When** the user clicks on it again, **Then** it becomes unchecked and returns to normal appearance
3. **Given** the user checks/unchecks items, **When** they close the modal, **Then** the state is saved and persists when they reopen the modal
4. **Given** multiple items are checked, **When** the user views the progress indicator, **Then** it shows "X / Y completed" and a progress bar reflecting the percentage
5. **Given** the user checks items, **When** they navigate away and return later, **Then** their checked items remain checked for that evaluation

---

### User Story 3 - Include Completed Checklists in Playbook Export (Priority: P2)

When users export their evaluation results to a Playbook document, completed checklist items are included in the export, organized by category, providing a comprehensive practice record.

**Why this priority**: This enhances the value of the Playbook export by including practice tracking. While not critical for basic functionality, it significantly improves the user experience for those who want to review their practice history.

**Independent Test**: Can be fully tested by completing checklist items, exporting the Playbook, and verifying that completed items appear in the export document grouped by category with proper formatting. This delivers value by creating a comprehensive practice record that users can reference offline.

**Acceptance Scenarios**:

1. **Given** a user has completed checklist items for an evaluation, **When** they export the Playbook, **Then** the export includes a section showing completed checklist items
2. **Given** completed items exist across multiple categories, **When** the Playbook is exported, **Then** items are grouped by category with clear section headers
3. **Given** no checklist items are completed, **When** the Playbook is exported, **Then** the export either omits the checklist section or shows a message indicating no items completed
4. **Given** the export includes checklist items, **When** the user views the exported document, **Then** completed items are clearly marked (e.g., with checkmarks) and formatted for readability

---

### Edge Cases

- What happens when a user tries to access a checklist for a category that has no template items? (System should show empty state message)
- What happens if a checklist template category doesn't match any evaluation category? (System should show templates for closest matching category and log the mismatch for administrator review)
- How does the system handle network failures when saving checklist state? (System should revert optimistic UI update, show toast notification with retry option, and allow user to retry the operation)
- What happens if a checklist template is deactivated after a user has already completed it? (Completed items should still appear in user's history and exports)
- How does the system handle concurrent checklist updates from multiple browser tabs? (Last write wins, or optimistic updates with conflict resolution)
- What happens when a user's authentication expires while interacting with the checklist? (System should prompt re-authentication)
- How does the system handle very long checklist item text? (Text should wrap appropriately, modal should scroll)
- What happens when a user exceeds the rate limit for completion toggles? (System should return 429 Too Many Requests with retry-after header)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to open a checklist modal by clicking on evaluation category chips
- **FR-002**: System MUST display checklist items specific to the selected category, ordered by display priority
- **FR-003**: Users MUST be able to check and uncheck checklist items with immediate visual feedback
- **FR-004**: System MUST persist checklist completion state per user per evaluation across sessions
- **FR-005**: System MUST display progress indicators showing completed items count and percentage
- **FR-006**: System MUST fetch checklist templates from the database filtered by category and active status
- **FR-007**: System MUST merge checklist templates with user's completion status when displaying items
- **FR-008**: System MUST allow users to include completed checklist items in Playbook exports
- **FR-009**: System MUST group completed checklist items by category in Playbook exports
- **FR-010**: System MUST handle errors gracefully when checklist operations fail (network errors, authentication errors, database errors) by displaying toast notifications with retry option and reverting optimistic UI updates
- **FR-011**: System MUST show appropriate empty states when no checklist items exist for a category
- **FR-012**: System MUST ensure users can only view and modify their own checklist completions
- **FR-013**: System MUST rate limit checklist completion toggles to 10 requests per minute per user to prevent abuse
  - **Rate Limit Response**: When the rate limit is exceeded, the system MUST return:
    - **HTTP Status**: 429 Too Many Requests
    - **Response Headers**:
      - `Retry-After`: Integer indicating seconds until the rate limit resets (e.g., "45" if 45 seconds remain)
      - `X-RateLimit-Limit`: The maximum number of requests allowed per window (e.g., "10")
      - `X-RateLimit-Remaining`: The number of requests remaining in the current window (e.g., "0")
      - `X-RateLimit-Reset`: Unix timestamp indicating when the rate limit window resets
    - **Response Body**: JSON object containing:
      ```json
      {
        "error": "rate_limit_exceeded",
        "message": "Too many requests. Please try again later.",
        "retry_after": 45,
        "limit": 10,
        "window_seconds": 60
      }
      ```
  - **Rate Limit Scope**: Applied per authenticated user (identified by user_id from session)
  - **Rate Limit Window**: Rolling 60-second window (not fixed minute boundaries)
- **FR-014**: System MUST display skeleton loaders (animated placeholders) in the modal while checklist items are being fetched
- **FR-015**: System MUST fire checklist_opened analytics event when modal opens and items are successfully loaded
- **FR-016**: System MUST handle category name mismatches by showing templates for the closest matching category and logging mismatches for administrator review
  - **Category Matching Algorithm**: When an evaluation category does not exactly match any checklist template category, the system MUST use the following matching strategy (in order of precedence):
    1. **Exact match** (case-insensitive): If a template category exactly matches the evaluation category (ignoring case), use that category
    2. **Prefix match**: If no exact match exists, find template categories that start with the evaluation category name (case-insensitive)
    3. **Levenshtein distance**: If no prefix match exists, calculate Levenshtein distance between the evaluation category and all template categories, select the category with the smallest distance (maximum distance threshold: 3 characters)
    4. **Fallback**: If no match is found within the distance threshold, show an empty state message indicating no checklist items are available for that category
  - **Matching Examples**:
    - Evaluation category "Communication" matches template category "Communication" (exact match)
    - Evaluation category "Problem Solving" matches template category "Problem-Solving" (Levenshtein distance: 1)
    - Evaluation category "Leadership" matches template category "Leadership Skills" (prefix match)
  - **Mismatch Logging**: When a category mismatch occurs (non-exact match used), the system MUST log the following information:
    - **Log Destination**: Sentry (error tracking service) with level "warning"
    - **Log Format**: JSON object containing:
      - `event_type`: "checklist_category_mismatch"
      - `evaluation_category`: The category name from the evaluation
      - `matched_template_category`: The template category that was matched
      - `matching_strategy`: The strategy used ("exact", "prefix", "levenshtein", or "none")
      - `levenshtein_distance`: The calculated distance (if strategy is "levenshtein", otherwise null)
      - `user_id`: Anonymized user ID (scrubbed via DataScrubber)
      - `evaluation_id`: The evaluation ID
      - `timestamp`: ISO 8601 timestamp
    - **Administrator Review**: Logs are accessible via Sentry dashboard for administrator review and template category alignment

### Key Entities *(include if feature involves data)*

- **Checklist Template**: Represents a coaching tip item that belongs to a specific category. Has attributes: category name, item text description, display order, active status. Templates are shared across all users and define the available coaching tips.

- **Checklist Completion**: Represents a user's completion of a specific checklist item for a specific evaluation. Has attributes: user ID, evaluation ID, template ID, completion timestamp. Each completion links a user, an evaluation, and a template, ensuring users can track progress per evaluation.

- **Evaluation Result**: The parent entity that contains evaluation feedback. Checklist completions are associated with evaluations, allowing users to track which coaching tips they've practiced for each evaluation session.

## Terminology Conventions

To ensure consistency across the codebase:

- **API/UI Layer**: Use camelCase for identifiers (e.g., `evaluationId`, `templateId`, `userId`)
- **Database Layer**: Use snake_case for column names (e.g., `evaluation_id`, `template_id`, `user_id`)
- **TypeScript Types**: Use camelCase for interface properties that map to API responses, snake_case for properties that map directly to database columns
- **Variable Names**: Use camelCase in application code (TypeScript/JavaScript)
- **File Names**: Use kebab-case for file names (e.g., `checklist-modal.tsx`, `evaluation-result-display.tsx`)

**Rationale**: This convention aligns with Next.js and TypeScript best practices while maintaining compatibility with Supabase PostgreSQL naming conventions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open a checklist modal and view items within 2 seconds of clicking a category chip
- **SC-002**: Checklist item state changes (check/uncheck) are reflected in the UI immediately (under 500ms visual feedback)
- **SC-003**: Checklist completion state persists correctly 100% of the time when users close and reopen the modal
- **SC-004**: 95% of users who open a checklist can successfully check at least one item without errors
- **SC-005**: Completed checklist items appear in Playbook exports for 100% of evaluations where items were completed
- **SC-006**: Users can export a Playbook including checklist items in under 5 seconds
- **SC-007**: System handles concurrent checklist updates without data loss or corruption
- **SC-008**: Checklist modal displays correctly on mobile devices (responsive design)

## Assumptions

- Checklist templates are pre-populated in the database by administrators
- Categories used in checklist templates match the evaluation category names
- Users are authenticated before accessing checklist features
- Evaluation IDs are valid UUIDs that correspond to existing evaluation results
- Playbook export functionality exists and can be extended to include checklist data
- Network connectivity is available when users interact with checklists (with graceful degradation for offline scenarios)

## Dependencies

- Evaluation results system must be functional and provide category information
- Database tables (checklist_templates, checklist_completions) must exist with proper schema
- Authentication system must be operational
- Playbook export system must exist and be extensible to include checklist data

## Clarifications

### Session 2025-01-27

- Q: Should there be rate limiting on checklist API endpoints to prevent abuse? → A: Rate limit completion toggles only (10 per minute per user)
- Q: What should users see while checklist items are being fetched? → A: Show skeleton loaders in the modal (animated placeholders)
- Q: How should error messages be displayed to users when checklist operations fail? → A: Show toast notifications with retry option
- Q: When should the checklist_opened analytics event fire? → A: When modal opens and items are successfully loaded
- Q: What should happen if a checklist template has a category name that doesn't match any evaluation category? → A: Show templates for closest matching category, log mismatch

## Out of Scope

- Creating or editing checklist templates through the UI (admin-only functionality)
- Sharing checklist progress with other users
- Checklist reminders or notifications
- Analytics tracking of checklist usage (basic events checklist_opened and checklist_completed are in scope; advanced analytics may be added separately)
- Checklist templates that vary by user type or subscription level
- Offline checklist functionality with sync
