# Quickstart: Confidence Cues & Analytics Events

**Feature**: 001-confidence-cues-analytics
**Date**: 2025-01-27
**Purpose**: Quick reference guide for implementing and testing the feature

## Overview

This feature adds privacy indicators (privacy copy and PD badge) to dashboard and drill pages, and tracks four analytics events: `specialty_cue_hit`, `checklist_opened`, `checklist_completed`, and `pd_verify_clicked`.

## Implementation Checklist

### Phase 1: Privacy Components

- [ ] Create `PrivacyCopy` component (`src/components/privacy/PrivacyCopy.tsx`)
  - Display 2-3 lines of privacy text
  - Responsive design (mobile, tablet, desktop)
  - Accessible (ARIA labels, keyboard navigation)

- [ ] Create `PrivacyDataBadge` component (`src/components/privacy/PrivacyDataBadge.tsx`)
  - Shield icon with "Privacy" or "Data Protection" text
  - Clickable link to `/privacy` or external URL
  - Accessible (ARIA labels, focus states)
  - Track `pd_verify_clicked` event on click

- [ ] Add privacy components to dashboard layout (`src/app/(dashboard)/layout.tsx`)
  - Add to footer section
  - Ensure visible on all dashboard pages

- [ ] Add privacy components to drill page (`src/app/(dashboard)/drill/[id]/page.tsx`)
  - Add to footer or dedicated section
  - Ensure visible on drill pages

### Phase 2: Analytics Event Tracking

- [ ] Add `specialty_cue_hit` event tracking
  - Location: `src/app/(dashboard)/drill/[id]/page.tsx`
  - Trigger: When specialty badge is displayed
  - Properties: `specialty`, `drill_id`, `user_id`, `timestamp`
  - Validation: Pass through DataScrubber and AnalyticsValidator

- [ ] Add `checklist_opened` event tracking
  - Location: `src/components/drill/ChecklistModal.tsx`
  - Trigger: When modal opens (`open` prop changes to `true`)
  - Properties: `evaluation_id`, `category`, `user_id`, `timestamp`
  - Validation: Pass through DataScrubber and AnalyticsValidator

- [ ] Add `checklist_completed` event tracking
  - Location: `src/components/drill/ChecklistModal.tsx`
  - Trigger: When all items in category are completed
  - Properties: `evaluation_id`, `category`, `completion_count`, `user_id`, `timestamp`
  - Validation: Pass through DataScrubber and AnalyticsValidator

- [ ] Add event constants to analytics service
  - Location: `src/features/notifications/application/analytics.ts`
  - Add: `SPECIALTY_CUE_HIT`, `CHECKLIST_OPENED`, `CHECKLIST_COMPLETED`, `PD_VERIFY_CLICKED`

### Phase 3: Testing

- [ ] Unit tests for privacy components
  - `tests/unit/components/privacy/PrivacyCopy.test.tsx`
  - `tests/unit/components/privacy/PrivacyDataBadge.test.tsx`
  - Test rendering, accessibility, click handling

- [ ] Unit tests for analytics events
  - `tests/unit/features/notifications/analytics-events.test.ts`
  - Test event structure, PII scrubbing, validation

- [ ] Integration tests for analytics tracking
  - `tests/integration/analytics/specialty-tracking.test.ts`
  - `tests/integration/analytics/checklist-tracking.test.ts`
  - `tests/integration/analytics/privacy-badge-tracking.test.ts`
  - Test event transmission, scrubbing, validation

- [ ] E2E tests for privacy indicators
  - `tests/e2e/confidence-cues/privacy-indicators.spec.ts`
  - Test visibility, accessibility, click behavior

- [ ] E2E tests for analytics events
  - `tests/e2e/confidence-cues/analytics-events.spec.ts`
  - Test event firing, properties, PostHog transmission

## Code Examples

### Privacy Copy Component

```typescript
// src/components/privacy/PrivacyCopy.tsx
"use client";

import { Shield } from "lucide-react";

export function PrivacyCopy() {
  return (
    <div className="text-xs text-muted-foreground">
      <p>
        Your data is encrypted and secure. We protect your personal information
        and never share it with third parties.
      </p>
    </div>
  );
}
```

### Privacy Data Badge Component

```typescript
// src/components/privacy/PrivacyDataBadge.tsx
"use client";

import { Shield } from "lucide-react";
import Link from "next/link";
import { analytics } from "@/features/notifications/application/analytics";

export function PrivacyDataBadge() {
  const handleClick = () => {
    // Track event before navigation
    analytics.track("pd_verify_clicked", {
      user_id: getAnonymizedUserId(),
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <Link
      href="/privacy"
      onClick={handleClick}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      aria-label="Privacy and Data Protection"
    >
      <Shield className="h-4 w-4" />
      <span>Privacy</span>
    </Link>
  );
}
```

### Specialty Tracking

```typescript
// In src/app/(dashboard)/drill/[id]/page.tsx
useEffect(() => {
  if (questionData.drill_specialty && questionData.drill_specialty !== "general") {
    analytics.track("specialty_cue_hit", {
      specialty: questionData.drill_specialty,
      drill_id: questionData.id,
      user_id: getAnonymizedUserId(),
      timestamp: new Date().toISOString(),
    });
  }
}, [questionData.drill_specialty, questionData.id]);
```

### Checklist Tracking

```typescript
// In src/components/drill/ChecklistModal.tsx
useEffect(() => {
  if (open) {
    analytics.track("checklist_opened", {
      evaluation_id: evaluationId,
      category: category,
      user_id: getAnonymizedUserId(),
      timestamp: new Date().toISOString(),
    });
  }
}, [open, evaluationId, category]);

const handleItemToggle = (itemId: string, completed: boolean) => {
  // ... existing toggle logic ...

  // Check if all items are completed
  const allCompleted = checklistItems.every(item => item.is_completed);
  if (allCompleted) {
    analytics.track("checklist_completed", {
      evaluation_id: evaluationId,
      category: category,
      completion_count: checklistItems.length,
      user_id: getAnonymizedUserId(),
      timestamp: new Date().toISOString(),
    });
  }
};
```

## Testing Commands

```bash
# Run unit tests
pnpm test:unit components/privacy
pnpm test:unit features/notifications/analytics-events

# Run integration tests
pnpm test:integration analytics

# Run E2E tests
pnpm test:e2e confidence-cues

# Run all tests
pnpm test

# Lint and type check
pnpm lint
pnpm typecheck
```

## Verification Steps

1. **Privacy Indicators**:
   - Navigate to dashboard → Verify privacy copy and badge visible
   - Navigate to drill page → Verify privacy copy and badge visible
   - Click PD badge → Verify navigation and event tracking

2. **Analytics Events**:
   - Open PostHog dashboard → Navigate to Live Events
   - View drill page with specialty → Verify `specialty_cue_hit` event
   - Open checklist modal → Verify `checklist_opened` event
   - Complete all checklist items → Verify `checklist_completed` event
   - Click PD badge → Verify `pd_verify_clicked` event

3. **PII Scrubbing**:
   - Check PostHog events → Verify no email addresses in properties
   - Check PostHog events → Verify no phone numbers in properties
   - Check PostHog events → Verify `distinctId` is anonymized (not email)

4. **Error Handling**:
   - Disable PostHog → Verify user interactions still work
   - Check console → Verify analytics errors are logged but not thrown

## Common Issues

### Privacy components not visible
- Check layout component includes privacy components
- Check CSS classes for visibility (not `hidden` or `opacity-0`)
- Check responsive design (mobile/tablet/desktop)

### Analytics events not firing
- Check PostHog configuration (API key, host)
- Check event tracking is not wrapped in try-catch (should be)
- Check console for errors
- Verify user is authenticated (or using anonymous ID)

### PII in events
- Check DataScrubber is called before transmission
- Check AnalyticsValidator is called before transmission
- Verify user_id is anonymized (not email)

## Next Steps

After implementation:
1. Monitor PostHog dashboard for event volume
2. Verify event properties match schemas
3. Check for PII leaks in events
4. Test error handling (disable PostHog)
5. Update documentation if needed
