# API Specification: Micro-Checklists

**Date**: 2025-01-27
**Feature**: Micro-Checklists
**Status**: Complete

## Overview

The Micro-Checklists feature provides three API endpoints for managing checklist templates and user completions. All endpoints require authentication and follow the existing InterviewApp API patterns.

## Base URL

All endpoints are relative to the API base URL:
```
/api/checklist
```

## Authentication

All endpoints require authentication via Supabase Auth. The user's identity is obtained from the session token in the request headers.

**Authentication Method**: Bearer token (Supabase session)

**Error Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

---

## Endpoints

### 1. GET /api/checklist

**Purpose**: Fetch checklist items for a category with completion status for the current user.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | Yes | Category name (e.g., "Communication", "Problem Solving") |
| `evaluationId` | string (UUID) | Yes | Evaluation ID to check completion status for |

**Request Example**:
```
GET /api/checklist?category=Communication&evaluationId=123e4567-e89b-12d3-a456-426614174000
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "template-uuid",
        "category": "Communication",
        "item_text": "Keep sentences under 20 words where possible",
        "display_order": 1,
        "is_completed": false
      },
      {
        "id": "template-uuid-2",
        "category": "Communication",
        "item_text": "Use specific examples to illustrate points",
        "display_order": 2,
        "is_completed": true
      }
    ],
    "category": "Communication",
    "evaluationId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Response Schema**:
```typescript
interface ChecklistResponse {
  success: boolean;
  data: {
    items: ChecklistItem[];
    category: string;
    evaluationId: string;
  };
}

interface ChecklistItem {
  id: string;              // Template UUID
  category: string;        // Category name
  item_text: string;       // Checklist item text
  display_order: number;   // Display order
  is_completed: boolean;   // Whether user has completed this item
}
```

**Error Responses**:

- **400 Bad Request** - Missing required parameters:
```json
{
  "success": false,
  "error": "Category is required",
  "code": "MISSING_CATEGORY"
}
```

- **401 Unauthorized** - Authentication required:
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "error": "Failed to fetch checklist",
  "code": "INTERNAL_SERVER_ERROR"
}
```

**Analytics Event**: None (fetching data, not user action)

---

### 2. POST /api/checklist/complete

**Purpose**: Toggle completion status of a checklist item for the current user's evaluation.

**Request Body**:

```json
{
  "evaluation_id": "123e4567-e89b-12d3-a456-426614174000",
  "template_id": "template-uuid",
  "completed": true
}
```

**Request Schema**:
```typescript
interface CompleteChecklistRequest {
  evaluation_id: string;   // UUID of evaluation
  template_id: string;     // UUID of checklist template
  completed: boolean;      // true to complete, false to uncomplete
}
```

**Request Example**:
```bash
POST /api/checklist/complete
Content-Type: application/json

{
  "evaluation_id": "123e4567-e89b-12d3-a456-426614174000",
  "template_id": "abc123-def456-ghi789",
  "completed": true
}
```

**Response** (200 OK) - When completing:
```json
{
  "success": true,
  "data": {
    "completed": true,
    "completion": {
      "id": "completion-uuid",
      "user_id": "user-uuid",
      "evaluation_id": "123e4567-e89b-12d3-a456-426614174000",
      "template_id": "abc123-def456-ghi789",
      "completed_at": "2025-01-27T10:30:00Z",
      "created_at": "2025-01-27T10:30:00Z"
    }
  }
}
```

**Response** (200 OK) - When uncompleting:
```json
{
  "success": true,
  "data": {
    "completed": false
  }
}
```

**Response Schema**:
```typescript
interface CompleteChecklistResponse {
  success: boolean;
  data: {
    completed: boolean;
    completion?: ChecklistCompletion;  // Only present when completed = true
  };
}
```

**Error Responses**:

- **400 Bad Request** - Invalid request payload:
```json
{
  "success": false,
  "error": "Invalid request payload",
  "code": "VALIDATION_ERROR"
}
```

- **401 Unauthorized** - Authentication required:
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "error": "Failed to update checklist",
  "code": "INTERNAL_SERVER_ERROR"
}
```

**Analytics Event**: `checklist_completed`
- Fired when `completed: true`
- Properties: `{ category, evaluationId, templateId, itemText, timestamp }`
- Must be scrubbed via DataScrubber before transmission

---

### 3. GET /api/checklist/export

**Purpose**: Export completed checklist items for a Playbook. Returns formatted text suitable for including in a Playbook export.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `evaluationId` | string (UUID) | Yes | Evaluation ID to export checklist for |

**Request Example**:
```
GET /api/checklist/export?evaluationId=123e4567-e89b-12d3-a456-426614174000
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "evaluationId": "123e4567-e89b-12d3-a456-426614174000",
    "completions": {
      "Communication": [
        {
          "item_text": "Keep sentences under 20 words where possible",
          "display_order": 1
        }
      ],
      "Problem Solving": [
        {
          "item_text": "Use specific examples to illustrate points",
          "display_order": 2
        }
      ]
    },
    "deliveryNote": "Great improvement in communication skills!",
    "formattedText": "## Coaching Checklist - Completed Items\n\n**Score:** 85%\n**Date:** 1/27/2025\n\n**Delivery Note:** Great improvement in communication skills!\n\nYou've completed 2 coaching items across 2 categories:\n\n### Communication\n- ✅ Keep sentences under 20 words where possible\n\n### Problem Solving\n- ✅ Use specific examples to illustrate points\n\n",
    "totalCompleted": 2,
    "categoriesCount": 2
  }
}
```

**Response Schema**:
```typescript
interface ChecklistExportResponse {
  success: boolean;
  data: {
    evaluationId: string;
    completions: Record<string, Array<{
      item_text: string;
      display_order: number;
    }>>;
    deliveryNote: string | null;
    formattedText: string;        // Markdown-formatted text for Playbook
    totalCompleted: number;
    categoriesCount: number;
  };
}
```

**Formatted Text Format**:
The `formattedText` field contains markdown-formatted text suitable for inclusion in a Playbook export:

```markdown
## Coaching Checklist - Completed Items

**Score:** 85%
**Date:** 1/27/2025

**Delivery Note:** Great improvement in communication skills!

You've completed 2 coaching items across 2 categories:

### Communication
- ✅ Keep sentences under 20 words where possible

### Problem Solving
- ✅ Use specific examples to illustrate points
```

**Error Responses**:

- **400 Bad Request** - Missing evaluation ID:
```json
{
  "success": false,
  "error": "Evaluation ID is required",
  "code": "MISSING_EVALUATION_ID"
}
```

- **401 Unauthorized** - Authentication required:
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "error": "Failed to export checklist",
  "code": "INTERNAL_SERVER_ERROR"
}
```

**Analytics Event**: None (export operation, not user action)

---

## Common Response Patterns

### Success Response Format

All successful responses follow this pattern:
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response Format

All error responses follow this pattern:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

**Error Codes**:
- `UNAUTHORIZED` - Authentication required
- `VALIDATION_ERROR` - Invalid request payload
- `MISSING_CATEGORY` - Category parameter missing
- `MISSING_EVALUATION_ID` - Evaluation ID parameter missing
- `INTERNAL_SERVER_ERROR` - Server error

---

## Rate Limiting

Currently no rate limiting is applied. Future considerations:
- Rate limit completion toggles to prevent abuse
- Rate limit export requests to prevent excessive database queries

---

## Analytics Events

### checklist_opened

**Trigger**: When checklist modal is opened (client-side event)

**Properties**:
```typescript
{
  category: string;           // Category name
  evaluationId: string;       // Evaluation UUID
  itemCount: number;          // Total items in checklist
  completedCount: number;     // Number of completed items
  timestamp: string;          // ISO timestamp
}
```

**Scrubbing**: All properties must be scrubbed via `DataScrubber.scrubObject()` before transmission.

### checklist_completed

**Trigger**: When checklist item is completed (server-side event in POST /api/checklist/complete)

**Properties**:
```typescript
{
  category: string;           // Category name
  evaluationId: string;      // Evaluation UUID
  templateId: string;        // Template UUID
  itemText: string;          // Item text (scrubbed if contains PII)
  timestamp: string;         // ISO timestamp
}
```

**Scrubbing**: All properties must be scrubbed via `DataScrubber.scrubObject()` before transmission. `itemText` may contain user input and must be scrubbed.

---

## Integration with Playbook Export

The checklist export endpoint is designed to be integrated into the main Playbook export. The integration pattern:

1. Main Playbook export endpoint calls `/api/checklist/export?evaluationId=<id>`
2. Includes `formattedText` in the Playbook document
3. Or uses `completions` object to format custom layout

**Example Integration**:
```typescript
// In main Playbook export endpoint
const checklistExport = await fetch(
  `/api/checklist/export?evaluationId=${evaluationId}`
);
const checklistData = await checklistExport.json();

// Include in Playbook
playbookContent += checklistData.data.formattedText;
```

---

## OpenAPI Schema

See `contracts/openapi.yaml` for complete OpenAPI 3.0 specification (to be generated if needed).

---

## Testing

### Manual Testing

1. **Get Checklist**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/checklist?category=Communication&evaluationId=<eval-id>"
   ```

2. **Complete Item**:
   ```bash
   curl -X POST -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"evaluation_id":"<eval-id>","template_id":"<template-id>","completed":true}' \
     "http://localhost:3000/api/checklist/complete"
   ```

3. **Export Checklist**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/checklist/export?evaluationId=<eval-id>"
   ```

### Automated Testing

See `tests/integration/checklist/checklist-api.test.ts` for integration tests.

---

## Version History

- **v1.0** (2025-01-27): Initial API specification
  - GET /api/checklist
  - POST /api/checklist/complete
  - GET /api/checklist/export
