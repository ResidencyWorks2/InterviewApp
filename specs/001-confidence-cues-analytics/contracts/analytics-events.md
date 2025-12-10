# Analytics Events Contract: Confidence Cues & Analytics Events

**Feature**: 001-confidence-cues-analytics
**Date**: 2025-01-27
**Purpose**: Define analytics event contracts for PostHog integration

## Event Contracts

### 1. specialty_cue_hit

**Trigger**: Fires when specialty badge is displayed in drill interface

**Event Name**: `specialty_cue_hit`

**Properties**:
```typescript
{
  specialty: string;        // Specialty name (e.g., "pediatrics", "cardiology")
  drill_id: string;         // Drill/question ID (UUID)
  user_id: string;          // Anonymized user ID (not email, hash or UUID)
  timestamp: string;        // ISO 8601 timestamp
}
```

**Example**:
```json
{
  "event": "specialty_cue_hit",
  "properties": {
    "specialty": "pediatrics",
    "drill_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "anon_abc123def456",
    "timestamp": "2025-01-27T10:30:00.000Z"
  },
  "distinctId": "anon_abc123def456"
}
```

**Validation**:
- `specialty` must not be "general"
- `drill_id` must be valid UUID
- `user_id` must not contain "@" (no email addresses)
- All properties must pass PII scrubbing

---

### 2. checklist_opened

**Trigger**: Fires when checklist modal is opened for a category

**Event Name**: `checklist_opened`

**Properties**:
```typescript
{
  evaluation_id: string;    // Evaluation ID (UUID)
  category: string;         // Checklist category (e.g., "communication")
  user_id: string;          // Anonymized user ID (not email, hash or UUID)
  timestamp: string;        // ISO 8601 timestamp
}
```

**Example**:
```json
{
  "event": "checklist_opened",
  "properties": {
    "evaluation_id": "660e8400-e29b-41d4-a716-446655440000",
    "category": "communication",
    "user_id": "anon_abc123def456",
    "timestamp": "2025-01-27T10:35:00.000Z"
  },
  "distinctId": "anon_abc123def456"
}
```

**Validation**:
- `evaluation_id` must be valid UUID
- `category` must be non-empty string
- `user_id` must not contain "@" (no email addresses)
- All properties must pass PII scrubbing

---

### 3. checklist_completed

**Trigger**: Fires when all items in a checklist category are completed

**Event Name**: `checklist_completed`

**Properties**:
```typescript
{
  evaluation_id: string;    // Evaluation ID (UUID)
  category: string;         // Checklist category
  completion_count: number;  // Total number of items completed
  user_id: string;          // Anonymized user ID (not email, hash or UUID)
  timestamp: string;        // ISO 8601 timestamp
}
```

**Example**:
```json
{
  "event": "checklist_completed",
  "properties": {
    "evaluation_id": "660e8400-e29b-41d4-a716-446655440000",
    "category": "communication",
    "completion_count": 5,
    "user_id": "anon_abc123def456",
    "timestamp": "2025-01-27T10:40:00.000Z"
  },
  "distinctId": "anon_abc123def456"
}
```

**Validation**:
- `evaluation_id` must be valid UUID
- `category` must be non-empty string
- `completion_count` must be positive integer
- `user_id` must not contain "@" (no email addresses)
- All properties must pass PII scrubbing

---

### 4. pd_verify_clicked

**Trigger**: Fires when PD (Privacy/Data Protection) badge is clicked

**Event Name**: `pd_verify_clicked`

**Properties**:
```typescript
{
  user_id: string;          // Anonymized user ID (not email, hash or UUID)
  timestamp: string;        // ISO 8601 timestamp
}
```

**Example**:
```json
{
  "event": "pd_verify_clicked",
  "properties": {
    "user_id": "anon_abc123def456",
    "timestamp": "2025-01-27T10:45:00.000Z"
  },
  "distinctId": "anon_abc123def456"
}
```

**Validation**:
- `user_id` must not contain "@" (no email addresses)
- All properties must pass PII scrubbing

---

## Common Properties

All events include:
- `distinctId`: Anonymized user identifier (same as `properties.user_id`)
- `timestamp`: ISO 8601 timestamp (included in properties and as PostHog metadata)

## PII Scrubbing Requirements

All event properties MUST pass through `DataScrubber.scrubObject()` before transmission:
- Email addresses → `[EMAIL_REDACTED]`
- Phone numbers → `[PHONE_REDACTED]`
- Names → `[NAME_REDACTED]`
- Other PII → `[REDACTED]`

## Event Validation

All events MUST pass through `AnalyticsValidator.validateEvent()` before transmission:
- Validates event name matches predefined types
- Validates properties structure matches schema
- Validates no PII in properties
- Validates `distinctId` is anonymized

## Error Handling

- Analytics tracking failures MUST NOT block user interactions
- Failed events should be logged but not retried (to avoid blocking)
- Use try-catch around all tracking calls

## Implementation Notes

- Events are transmitted to PostHog via `PostHogAnalyticsService.track()`
- Service automatically handles scrubbing and validation
- Events are not stored in database (PostHog only)
- Events are transmitted asynchronously (non-blocking)
