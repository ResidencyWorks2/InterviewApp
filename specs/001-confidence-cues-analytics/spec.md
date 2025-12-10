# Feature Specification: Confidence Cues & Analytics Events

**Feature Branch**: `001-confidence-cues-analytics`
**Created**: 2025-01-27
**Status**: Draft
**Input**: User description: "I want to implement the following but some may already be implemented - Habit/Trust (Confidence Cues): Privacy Copy, PD Badge, and Minimal Analytics events: specialty_cue_hit, checklist_opened, checklist_completed, pd_verify_clicked"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Privacy and Trust Indicators (Priority: P1)

Users need visible privacy and data protection information to build confidence in the application's commitment to protecting their personal information and interview responses.

**Why this priority**: Trust is foundational for users sharing sensitive interview practice data. Without visible privacy indicators, users may hesitate to use the application or may feel uncertain about data security.

**Independent Test**: Can be fully tested by verifying privacy copy is visible on dashboard/drill pages and PD badge is accessible and clickable, delivering immediate trust signals to users.

**Acceptance Scenarios**:

1. **Given** a user is viewing the dashboard or drill page, **When** they look at the interface, **Then** they see brief privacy lines explaining data protection
2. **Given** a user sees the PD (Privacy/Data Protection) badge, **When** they click on it, **Then** they are taken to `/privacy` route or external privacy policy page
3. **Given** a user is on any page with privacy indicators, **When** they view the page, **Then** the privacy copy is clearly visible but not intrusive

---

### User Story 2 - Specialty Selection Analytics (Priority: P2)

The system needs to track when users interact with specialty-based question selection to understand how specialty targeting is being used and improve question recommendations.

**Why this priority**: Understanding specialty selection patterns helps optimize the question recommendation algorithm and provides insights into user preferences.

**Independent Test**: Can be fully tested by selecting a specialty in the UI and verifying the `specialty_cue_hit` event appears in analytics with correct properties (user_id, drill_id, specialty, timestamp).

**Acceptance Scenarios**:

1. **Given** a user is viewing a question with a specialty, **When** the specialty badge is displayed on page load/view, **Then** the system tracks a `specialty_cue_hit` event once per page view with anonymized user_id, drill_id, specialty name, and timestamp
2. **Given** a user interacts with specialty filtering, **When** the interaction occurs, **Then** the analytics event contains no personally identifiable information

---

### User Story 3 - Checklist Interaction Analytics (Priority: P2)

The system needs to track checklist modal interactions to understand coaching effectiveness and identify which categories users engage with most.

**Why this priority**: Tracking checklist usage provides insights into which coaching categories are most valuable to users and helps improve the coaching experience.

**Independent Test**: Can be fully tested by opening a checklist modal and completing checklist items, verifying `checklist_opened` and `checklist_completed` events appear in analytics with correct properties.

**Acceptance Scenarios**:

1. **Given** a user views evaluation results with checklist items, **When** they open the checklist modal for a category, **Then** the system tracks a `checklist_opened` event with anonymized user_id, evaluation_id, category, and timestamp
2. **Given** a user has opened a checklist modal, **When** they toggle the last unchecked item to complete all items in a category (100% completion), **Then** the system immediately tracks a `checklist_completed` event with anonymized user_id, evaluation_id, category, completion_count, and timestamp
3. **Given** a user interacts with checklists, **When** events are tracked, **Then** all events contain no personally identifiable information

---

### User Story 4 - Privacy Badge Interaction Analytics (Priority: P3)

The system needs to track when users click the PD (Privacy/Data Protection) badge to understand user interest in privacy information and compliance verification.

**Why this priority**: Understanding privacy badge engagement helps measure user trust levels and identifies if users need more accessible privacy information.

**Independent Test**: Can be fully tested by clicking the PD badge and verifying the `pd_verify_clicked` event appears in analytics with anonymized user_id and timestamp.

**Acceptance Scenarios**:

1. **Given** a user sees the PD badge on the interface, **When** they click on it, **Then** the system tracks a `pd_verify_clicked` event with anonymized user_id and timestamp
2. **Given** a user clicks the PD badge, **When** the event is tracked, **Then** the event contains no personally identifiable information

---

### Edge Cases

- What happens when analytics service is unavailable? System should gracefully degrade without blocking user interactions
- How does system handle privacy copy display on mobile devices? Privacy copy should be responsive and readable on all screen sizes
- What happens when PD badge link is broken or unavailable? System should handle errors gracefully and provide fallback information
- How does system handle analytics events when user is not authenticated? Events should still track with anonymous user_id
- What happens when checklist modal is opened but user closes without completing? Only `checklist_opened` event fires, not `checklist_completed`
- How does system handle specialty selection when specialty field is missing? Event should not fire or should handle gracefully with null/undefined specialty

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display brief privacy lines (2-3 lines of generic trust-building text) on dashboard and drill pages that explain data protection and privacy commitment. Text can be customized later but must be concise and non-intrusive.
- **FR-002**: System MUST provide a clickable PD (Privacy/Data Protection) badge that links to `/privacy` route (create if needed) with fallback to external privacy policy URL if route doesn't exist
- **FR-003**: System MUST track `specialty_cue_hit` analytics event when a specialty badge is displayed on page load/view (once per page view), including anonymized user_id, drill_id, specialty name, and timestamp
- **FR-004**: System MUST track `checklist_opened` analytics event when checklist modal is opened, including anonymized user_id, evaluation_id, category, and timestamp
- **FR-005**: System MUST track `checklist_completed` analytics event immediately when the toggle action results in 100% completion (all items in a checklist category are checked), including anonymized user_id, evaluation_id, category, completion_count, and timestamp
- **FR-006**: System MUST track `pd_verify_clicked` analytics event when PD badge is clicked, including anonymized user_id and timestamp
- **FR-007**: System MUST ensure all analytics events contain no personally identifiable information (PII) and pass through data scrubbing
- **FR-008**: System MUST ensure privacy copy and PD badge are visible and accessible on all relevant pages (dashboard, drill pages)
- **FR-009**: System MUST handle analytics tracking failures gracefully without blocking user interactions
- **FR-010**: Privacy copy MUST be concise and non-intrusive while still conveying trust and data protection commitment

### Key Entities *(include if feature involves data)*

- **Privacy Indicator**: Represents privacy copy text and PD badge display, includes visibility state and accessibility attributes
- **Analytics Event**: Represents tracked user interactions, includes event name, anonymized user identifier, contextual properties (drill_id, evaluation_id, category, specialty), and timestamp
- **Checklist State**: Represents checklist modal open/closed state and completion status for tracking analytics events

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see privacy indicators (privacy copy and PD badge) on dashboard and drill pages within 2 seconds of page load
- **SC-002**: 95% of specialty selections result in successful `specialty_cue_hit` event tracking
- **SC-003**: 95% of checklist modal opens result in successful `checklist_opened` event tracking
- **SC-004**: 95% of checklist completions result in successful `checklist_completed` event tracking
- **SC-005**: 95% of PD badge clicks result in successful `pd_verify_clicked` event tracking
- **SC-006**: 100% of analytics events pass PII scrubbing validation with zero PII detected
- **SC-007**: Analytics tracking failures do not block user interactions in 100% of cases
- **SC-008**: Privacy copy and PD badge are accessible and functional on mobile, tablet, and desktop viewports

## Assumptions

- Privacy copy text will use generic trust-building text (2-3 lines) that can be customized later. Example: "Your data is encrypted and secure. We protect your personal information and never share it with third parties."
- PD badge will link to `/privacy` route (create if needed) with fallback to external privacy policy URL if route doesn't exist
- Specialty selection tracking fires when specialty badge is displayed on page load/view (once per page view, not on user interactions)
- Checklist completion is defined as all items in a category being marked as completed. The `checklist_completed` event fires immediately when the toggle action results in 100% completion (not on modal close)
- Analytics service (PostHog) is already configured and available
- Data scrubbing infrastructure is already in place and will be used for all analytics events
- Health indicator and health banner are already implemented and do not need changes

## Dependencies

- Existing analytics infrastructure (PostHogAnalyticsService)
- Existing data scrubbing utilities (DataScrubber, AnalyticsValidator)
- Existing checklist modal component (ChecklistModal)
- Existing specialty display in drill interface
- Existing authentication system for user identification (anonymized)

## Clarifications

### Session 2025-01-27

- Q: When should `specialty_cue_hit` event fire - on display, on selection, or both? → A: Fire when specialty badge is displayed on page load/view (once per page view)
- Q: What exact text should privacy copy display? → A: Use generic trust-building text (2-3 lines) that can be customized later
- Q: What URL/path should PD badge link to? → A: Link to `/privacy` route (create if needed) with fallback to external privacy policy URL if route doesn't exist
- Q: When should `checklist_completed` event fire - on toggle, on modal close, or both? → A: Fire immediately when the toggle action results in 100% completion (all items checked)

## Out of Scope

- Health indicator and health banner (already implemented per signoff.md)
- Changes to checklist modal functionality beyond analytics tracking
- Changes to specialty selection logic beyond analytics tracking
- Privacy policy content creation (assumes content exists or will be provided)
- Privacy verification page creation (assumes page exists or will be created separately)
