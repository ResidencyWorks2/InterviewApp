# Data Model: Confidence Cues & Analytics Events

**Feature**: 001-confidence-cues-analytics
**Date**: 2025-01-27
**Purpose**: Define core entities and their relationships for privacy indicators and analytics events

## Core Entities

### PrivacyIndicator

**Purpose**: Represents privacy copy text and PD badge display configuration

**Attributes**:
- `id: string` - Unique identifier (not stored, used for React key)
- `copyText: string` - Privacy copy text (2-3 lines)
- `badgeText: string` - PD badge text ("Privacy" or "Data Protection")
- `badgeIcon: string` - Icon name (e.g., "Shield")
- `badgeLink: string` - Link URL (e.g., "/privacy" or external URL)
- `visible: boolean` - Visibility state (always true for this feature)
- `accessibilityLabel: string` - ARIA label for screen readers

**Validation Rules**:
- `copyText` must be non-empty string, max 200 characters
- `badgeText` must be non-empty string, max 50 characters
- `badgeLink` must be valid URL or path
- `accessibilityLabel` must be non-empty string

**State Transitions**:
- `hidden` → `visible` (on component mount)

**Storage**: Not stored in database. Configuration can be in constants or environment variables.

**Relationships**:
- Referenced by dashboard layout and drill pages (presentation layer)

---

### AnalyticsEvent (Extended)

**Purpose**: Represents tracked user interactions for confidence cues and analytics

**Attributes** (existing, extended with new event types):
- `eventName: string` - Event name (one of: `specialty_cue_hit`, `checklist_opened`, `checklist_completed`, `pd_verify_clicked`)
- `properties: Record<string, unknown>` - Event properties (MUST be scrubbed)
- `distinctId: string` - User identifier (MUST be anonymized, not email)
- `timestamp: Date` - When event occurred

**Validation Rules** (existing, applies to new events):
- `properties` MUST NOT contain email addresses
- `properties` MUST NOT contain phone numbers
- `properties` MUST NOT contain names or other PII
- `distinctId` MUST NOT be an email address
- `distinctId` MUST be anonymized (hash or UUID format)
- Event-specific property validation (see Event Schemas below)

**Storage**: Transmitted to PostHog, not stored in database

**Relationships**:
- Uses `AnonymizedUserIdentifier` for `distinctId`
- Properties scrubbed by `DataScrubber` before transmission
- Validated by `AnalyticsValidator` before transmission

---

### SpecialtyCueHitEvent

**Purpose**: Represents analytics event when specialty is displayed in drill interface

**Attributes** (extends AnalyticsEvent):
- `eventName: "specialty_cue_hit"` - Fixed event name
- `properties.specialty: string` - Specialty name (e.g., "pediatrics", "cardiology")
- `properties.drill_id: string` - Drill/question ID
- `properties.user_id: string` - Anonymized user ID
- `properties.timestamp: string` - ISO timestamp

**Validation Rules**:
- `specialty` must be non-empty string, not "general"
- `drill_id` must be non-empty string (UUID format)
- `user_id` must be anonymized (not email, hash or UUID format)

**State Transitions**:
- `pending` → `queued` → `transmitted` | `failed`

**Storage**: Transmitted to PostHog only

---

### ChecklistOpenedEvent

**Purpose**: Represents analytics event when checklist modal is opened

**Attributes** (extends AnalyticsEvent):
- `eventName: "checklist_opened"` - Fixed event name
- `properties.evaluation_id: string` - Evaluation ID
- `properties.category: string` - Checklist category (e.g., "communication", "leadership")
- `properties.user_id: string` - Anonymized user ID
- `properties.timestamp: string` - ISO timestamp

**Validation Rules**:
- `evaluation_id` must be non-empty string (UUID format)
- `category` must be non-empty string
- `user_id` must be anonymized (not email, hash or UUID format)

**State Transitions**:
- `pending` → `queued` → `transmitted` | `failed`

**Storage**: Transmitted to PostHog only

---

### ChecklistCompletedEvent

**Purpose**: Represents analytics event when all items in a checklist category are completed

**Attributes** (extends AnalyticsEvent):
- `eventName: "checklist_completed"` - Fixed event name
- `properties.evaluation_id: string` - Evaluation ID
- `properties.category: string` - Checklist category
- `properties.completion_count: number` - Total number of items completed
- `properties.user_id: string` - Anonymized user ID
- `properties.timestamp: string` - ISO timestamp

**Validation Rules**:
- `evaluation_id` must be non-empty string (UUID format)
- `category` must be non-empty string
- `completion_count` must be positive integer
- `user_id` must be anonymized (not email, hash or UUID format)

**State Transitions**:
- `pending` → `queued` → `transmitted` | `failed`

**Storage**: Transmitted to PostHog only

---

### PrivacyBadgeClickedEvent

**Purpose**: Represents analytics event when PD badge is clicked

**Attributes** (extends AnalyticsEvent):
- `eventName: "pd_verify_clicked"` - Fixed event name
- `properties.user_id: string` - Anonymized user ID
- `properties.timestamp: string` - ISO timestamp

**Validation Rules**:
- `user_id` must be anonymized (not email, hash or UUID format)
- No other properties required (minimal event)

**State Transitions**:
- `pending` → `queued` → `transmitted` | `failed`

**Storage**: Transmitted to PostHog only

---

## Relationships

### PrivacyIndicator → AnalyticsEvent (1:Many)

- Privacy badge click generates `pd_verify_clicked` event
- Privacy indicator is independent entity (not stored)
- Multiple events can reference privacy indicator (via badge clicks)

### ChecklistModal → AnalyticsEvent (1:Many)

- Checklist modal open generates `checklist_opened` event
- Checklist completion generates `checklist_completed` event
- Multiple events can reference same checklist modal instance

### DrillPage → AnalyticsEvent (1:Many)

- Specialty display generates `specialty_cue_hit` event
- Multiple events can reference same drill page (if multiple specialties)

---

## Data Flow

1. **Privacy Indicator Display**:
   - Component mounts → Privacy copy and badge rendered
   - Badge click → `pd_verify_clicked` event created → Scrubbed → Validated → Transmitted

2. **Specialty Display**:
   - Drill page loads with specialty → `specialty_cue_hit` event created → Scrubbed → Validated → Transmitted

3. **Checklist Interaction**:
   - Modal opens → `checklist_opened` event created → Scrubbed → Validated → Transmitted
   - All items completed → `checklist_completed` event created → Scrubbed → Validated → Transmitted

4. **Event Processing**:
   - Event created with properties → `DataScrubber.scrubObject()` → `AnalyticsValidator.validateEvent()` → `PostHogAnalyticsService.track()` → PostHog API

---

## Validation Schemas

### SpecialtyCueHitEvent Schema

```typescript
const SpecialtyCueHitEventSchema = z.object({
  eventName: z.literal("specialty_cue_hit"),
  properties: z.object({
    specialty: z.string().min(1).refine((v) => v !== "general"),
    drill_id: z.string().uuid(),
    user_id: z.string().min(1).refine((v) => !v.includes("@")), // No email
    timestamp: z.string().datetime(),
  }),
  distinctId: z.string().min(1).refine((v) => !v.includes("@")), // No email
});
```

### ChecklistOpenedEvent Schema

```typescript
const ChecklistOpenedEventSchema = z.object({
  eventName: z.literal("checklist_opened"),
  properties: z.object({
    evaluation_id: z.string().uuid(),
    category: z.string().min(1),
    user_id: z.string().min(1).refine((v) => !v.includes("@")), // No email
    timestamp: z.string().datetime(),
  }),
  distinctId: z.string().min(1).refine((v) => !v.includes("@")), // No email
});
```

### ChecklistCompletedEvent Schema

```typescript
const ChecklistCompletedEventSchema = z.object({
  eventName: z.literal("checklist_completed"),
  properties: z.object({
    evaluation_id: z.string().uuid(),
    category: z.string().min(1),
    completion_count: z.number().int().positive(),
    user_id: z.string().min(1).refine((v) => !v.includes("@")), // No email
    timestamp: z.string().datetime(),
  }),
  distinctId: z.string().min(1).refine((v) => !v.includes("@")), // No email
});
```

### PrivacyBadgeClickedEvent Schema

```typescript
const PrivacyBadgeClickedEventSchema = z.object({
  eventName: z.literal("pd_verify_clicked"),
  properties: z.object({
    user_id: z.string().min(1).refine((v) => !v.includes("@")), // No email
    timestamp: z.string().datetime(),
  }),
  distinctId: z.string().min(1).refine((v) => !v.includes("@")), // No email
});
```

---

## Notes

- All analytics events are ephemeral (not stored in database)
- Events are transmitted to PostHog only
- PII scrubbing is mandatory for all events
- Event validation is mandatory before transmission
- Analytics failures do not block user interactions
