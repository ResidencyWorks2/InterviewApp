# Research: Confidence Cues & Analytics Events

**Feature**: 001-confidence-cues-analytics
**Date**: 2025-01-27
**Purpose**: Resolve technical unknowns and document design decisions

## Research Questions

### 1. Privacy Copy Content and Placement

**Question**: What should the privacy copy text say and where should it be displayed?

**Research Findings**:
- Existing privacy information in `docs/user-guide.md` covers data protection basics
- Privacy copy should be brief (2-3 lines max) and non-intrusive
- Common patterns: footer placement, header banner, or dedicated privacy section
- Best practice: Visible but not distracting, accessible from all relevant pages

**Decision**:
- Privacy copy will be 2-3 lines of concise text explaining data protection commitment
- Display in footer of dashboard layout (visible on all dashboard pages)
- Also display on drill pages in a subtle banner or footer section
- Text will reference existing privacy policy if available, otherwise use generic trust-building language

**Rationale**:
- Footer placement is standard pattern and non-intrusive
- Reusable across all dashboard pages via layout component
- Follows accessibility best practices (visible but not blocking)

**Alternatives Considered**:
- Header banner: Rejected because it's too intrusive and may block content
- Modal on first visit: Rejected because it adds friction and may be dismissed
- Dedicated privacy page only: Rejected because users may not discover it

---

### 2. PD Badge Implementation and Link Target

**Question**: What should the PD (Privacy/Data Protection) badge look like and where should it link?

**Research Findings**:
- PD badges typically link to privacy policy, compliance verification, or data protection information
- Common badge designs: Shield icon, lock icon, or "Privacy" text badge
- Badge should be clickable and accessible (keyboard navigation, screen readers)
- Link target should be existing privacy page or create new `/privacy` route

**Decision**:
- PD badge will use shield icon with "Privacy" or "Data Protection" text
- Badge will link to `/privacy` route (to be created if not exists) or external privacy policy URL
- Badge will be positioned near privacy copy in footer or header
- Badge will be accessible (keyboard navigable, ARIA labels, focus states)

**Rationale**:
- Shield icon is universally recognized for privacy/security
- Footer placement matches privacy copy location
- Accessible design ensures compliance with WCAG guidelines

**Alternatives Considered**:
- Lock icon: Rejected because it's more associated with security than privacy
- Text-only badge: Rejected because icon provides visual recognition
- External link only: Rejected because internal route provides better UX

---

### 3. Analytics Event Tracking Patterns

**Question**: How should analytics events be structured and when should they fire?

**Research Findings**:
- Existing analytics infrastructure uses `PostHogAnalyticsService` with `DataScrubber` and `AnalyticsValidator`
- Events follow pattern: `eventName`, `properties` (scrubbed), `distinctId` (anonymized), `timestamp`
- Events should fire on user interactions (clicks, opens, completions)
- Events must pass PII scrubbing before transmission
- Analytics failures should not block user interactions (non-blocking)

**Decision**:
- Use existing `PostHogAnalyticsService.track()` method for all events
- Event properties will include: `user_id` (anonymized), contextual IDs (drill_id, evaluation_id, category, specialty), `timestamp`
- Events fire immediately on user action (synchronous tracking, async transmission)
- All events pass through `DataScrubber.scrubObject()` before transmission
- All events validated via `AnalyticsValidator.validateEvent()` before transmission
- Tracking wrapped in try-catch to prevent failures from blocking UI

**Rationale**:
- Leverages existing infrastructure reduces code duplication
- Consistent event structure enables easier analysis
- Non-blocking pattern ensures good UX even if analytics fails

**Alternatives Considered**:
- Queue-based tracking: Rejected because it adds complexity and delay
- Batch tracking: Rejected because real-time tracking is more valuable
- Separate tracking service: Rejected because existing service is sufficient

---

### 4. Specialty Selection Tracking Trigger

**Question**: When should `specialty_cue_hit` event fire - on display or on selection?

**Research Findings**:
- Specialty is already displayed in drill interface as badge (see `SPECIALTY_LAYER_IMPLEMENTATION.md`)
- Specialty can be selected via API query parameter (`/api/questions?specialty=pediatrics`)
- Display-based tracking captures all specialty views
- Selection-based tracking captures only explicit user choices

**Decision**:
- `specialty_cue_hit` event fires when specialty badge is displayed in drill interface
- Event fires on drill page load if specialty exists and is displayed
- Event includes `drill_id`, `specialty` name, `timestamp`
- Event does not fire if specialty is missing or is "general"

**Rationale**:
- Display-based tracking captures all specialty interactions (including implicit views)
- Aligns with signoff.md requirement: "Fires when specialty selected" (interpreted as displayed/selected)
- Avoids duplicate events (fires once per drill page view with specialty)

**Alternatives Considered**:
- Selection-only tracking: Rejected because it misses implicit specialty views
- Both display and selection: Rejected because it creates duplicate events
- API-level tracking: Rejected because it doesn't capture UI interactions

---

### 5. Checklist Completion Detection

**Question**: How should `checklist_completed` event detect completion?

**Research Findings**:
- Existing `ChecklistModal` component tracks item completion state
- Completion is defined as all items in a category marked as completed
- Modal tracks completion via `onItemToggle` callback
- Completion state is stored per-user per-evaluation

**Decision**:
- `checklist_completed` event fires when all items in a category are marked as completed
- Event fires on the toggle action that results in 100% completion
- Event includes `evaluation_id`, `category`, `completion_count` (total items), `timestamp`
- Event fires only once per category per evaluation (when first reaching 100%)

**Rationale**:
- Aligns with spec definition: "when all items in a checklist category are completed"
- Single event per category prevents duplicate tracking
- Completion count provides useful analytics data

**Alternatives Considered**:
- Fire on every completion: Rejected because it creates noise and doesn't indicate full completion
- Fire only on modal close: Rejected because it may miss completion if user closes before finishing
- Fire on explicit "complete" button: Rejected because no such button exists in current UI

---

### 6. Privacy Badge Click Tracking

**Question**: How should `pd_verify_clicked` event be tracked?

**Research Findings**:
- Badge will be a clickable component (link or button)
- Click tracking should fire before navigation (if internal link) or immediately (if external)
- Event should include minimal properties (user_id, timestamp) as per spec

**Decision**:
- `pd_verify_clicked` event fires on badge click (before navigation)
- Event includes `user_id` (anonymized), `timestamp`
- Event fires synchronously before navigation to ensure tracking
- If navigation fails, event still fires (tracking is independent of navigation)

**Rationale**:
- Pre-navigation tracking ensures event is captured even if navigation is slow
- Minimal properties align with spec requirements
- Independent tracking ensures analytics works even if link is broken

**Alternatives Considered**:
- Post-navigation tracking: Rejected because navigation may be slow or fail
- Include URL in properties: Rejected because it's not needed per spec and adds complexity
- Batch with other events: Rejected because it's a distinct user action

---

## Technology Choices

### Analytics Infrastructure

**Choice**: Use existing `PostHogAnalyticsService` from `src/features/notifications/infrastructure/posthog/AnalyticsService.ts`

**Rationale**:
- Already integrated and configured
- Has PII scrubbing via `DataScrubber`
- Has event validation via `AnalyticsValidator`
- Follows existing patterns

**Alternatives Considered**:
- Direct PostHog client: Rejected because it bypasses scrubbing and validation
- New analytics service: Rejected because it duplicates existing infrastructure

### UI Component Library

**Choice**: Use existing Radix UI components and Tailwind CSS 4.x

**Rationale**:
- Already in use throughout application
- Provides accessible components
- Consistent with existing design system

**Alternatives Considered**:
- Custom components: Rejected because it increases maintenance burden
- Different UI library: Rejected because it creates inconsistency

### Privacy Badge Icon

**Choice**: Use Lucide React shield icon (`Shield` or `ShieldCheck`)

**Rationale**:
- Already used in codebase (Lucide React icons)
- Shield icon is universally recognized for privacy/security
- Consistent with existing icon usage

**Alternatives Considered**:
- Lock icon: Rejected because it's more security-focused than privacy-focused
- Custom icon: Rejected because it adds maintenance burden
- Text-only: Rejected because icon provides visual recognition

---

## Integration Points

### Existing Components to Modify

1. **ChecklistModal** (`src/components/drill/ChecklistModal.tsx`):
   - Add `checklist_opened` event on modal open
   - Add `checklist_completed` event on 100% completion

2. **Drill Page** (`src/app/(dashboard)/drill/[id]/page.tsx`):
   - Add `specialty_cue_hit` event when specialty badge is displayed
   - Add privacy components (PrivacyCopy, PrivacyDataBadge)

3. **Dashboard Layout** (`src/app/(dashboard)/layout.tsx`):
   - Add privacy components to footer

4. **Dashboard Page** (`src/app/(dashboard)/dashboard/page.tsx`):
   - Add privacy components if needed (or rely on layout)

### Existing Services to Use

1. **PostHogAnalyticsService** (`src/features/notifications/infrastructure/posthog/AnalyticsService.ts`):
   - Use `track()` method for all events
   - Service already handles scrubbing and validation

2. **DataScrubber** (`src/shared/security/data-scrubber.ts`):
   - Used by PostHogAnalyticsService automatically
   - No direct usage needed

3. **AnalyticsValidator** (`src/shared/security/analytics-validator.ts`):
   - Used by PostHogAnalyticsService automatically
   - No direct usage needed

---

## Open Questions Resolved

All research questions have been resolved. No remaining unknowns.

---

## Next Steps

1. Create privacy components (PrivacyCopy, PrivacyDataBadge)
2. Integrate analytics tracking into existing components
3. Add privacy components to layout and pages
4. Write tests for components and analytics tracking
5. Verify PII scrubbing and event validation
