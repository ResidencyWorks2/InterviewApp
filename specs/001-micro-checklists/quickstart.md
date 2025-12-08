# Quickstart Guide: Micro-Checklists

**Date**: 2025-01-27
**Feature**: Micro-Checklists
**Status**: Complete

## Overview

Micro-Checklists provide coaching tips organized by evaluation category. Users can check off items as they practice, track their progress, and include completed items in Playbook exports.

## User Guide

### Accessing Checklists

1. **Complete an Evaluation**: Submit a response (text or audio) and receive evaluation results
2. **View Category Chips**: Evaluation results display category chips (e.g., "Communication", "Problem Solving")
3. **Open Checklist**: Click on any category chip to open the checklist modal
4. **View Items**: The modal displays coaching tips specific to that category

### Completing Checklist Items

1. **Check Items**: Click on any checklist item to mark it as completed
   - Completed items show a green checkmark and strikethrough text
   - Progress indicator updates automatically
2. **Uncheck Items**: Click a completed item again to uncheck it
3. **Track Progress**: View progress bar showing "X / Y completed"
4. **Persistent State**: Your completions are saved and persist across sessions

### Exporting to Playbook

1. **Complete Items**: Check off items you want to include in your Playbook
2. **Export Playbook**: Use the Playbook export feature (integration pending)
3. **View Completed Items**: Your completed checklist items appear in the Playbook, organized by category

## Developer Guide

### Setup

1. **Database**: Ensure migration `20251206010000_create_checklist_tables.sql` is applied
2. **Types**: Regenerate TypeScript types: `pnpm run update-types`
3. **Environment**: No additional environment variables required

### API Usage

#### Get Checklist Items

```typescript
const response = await fetch(
  `/api/checklist?category=Communication&evaluationId=${evaluationId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const data = await response.json();
// data.data.items contains ChecklistItem[]
```

#### Complete Checklist Item

```typescript
const response = await fetch('/api/checklist/complete', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    evaluation_id: evaluationId,
    template_id: templateId,
    completed: true
  })
});
```

#### Export Checklist

```typescript
const response = await fetch(
  `/api/checklist/export?evaluationId=${evaluationId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const data = await response.json();
// data.data.formattedText contains markdown-formatted export
```

### Component Usage

#### ChecklistModal

```typescript
import { ChecklistModal } from '@/components/drill/ChecklistModal';

<ChecklistModal
  open={isOpen}
  onOpenChange={setIsOpen}
  category="Communication"
  categoryIcon="💬"
  evaluationId={evaluationId}
  items={checklistItems}
  onItemToggle={(itemId, completed) => {
    console.log(`Item ${itemId} ${completed ? 'completed' : 'uncompleted'}`);
  }}
/>
```

### Analytics Events

#### checklist_opened

Fired when checklist modal opens (client-side):

```typescript
import { PostHogAnalyticsService } from '@/features/notifications/infrastructure/posthog/AnalyticsService';

await analyticsService.track('checklist_opened', {
  category: 'Communication',
  evaluationId: evaluationId,
  itemCount: items.length,
  completedCount: items.filter(i => i.is_completed).length
}, userId);
```

#### checklist_completed

Fired when item is completed (server-side in API route):

```typescript
await analyticsService.track('checklist_completed', {
  category: category,
  evaluationId: evaluationId,
  templateId: templateId,
  itemText: itemText
}, userId);
```

**Important**: All analytics properties must be scrubbed via `DataScrubber.scrubObject()` before transmission.

## Testing

### Manual Testing

1. **Start Dev Server**: `pnpm dev`
2. **Navigate to Drill**: Go to `/drill/[id]`
3. **Submit Response**: Complete an evaluation
4. **Open Checklist**: Click on a category chip
5. **Complete Items**: Check/uncheck items
6. **Verify Persistence**: Close and reopen modal, verify state persists
7. **Export**: Test Playbook export (when integrated)

### Automated Testing

```bash
# Run unit tests
pnpm test tests/unit/checklist

# Run integration tests
pnpm test tests/integration/checklist

# Run E2E tests
pnpm test:e2e tests/e2e/checklist
```

## Troubleshooting

### Checklist Modal Doesn't Open

- **Check**: Category chip click handler is wired correctly
- **Check**: `evaluationId` is valid and passed to modal
- **Check**: Browser console for errors

### Items Don't Persist

- **Check**: API endpoint returns success response
- **Check**: Database RLS policies allow user access
- **Check**: Network tab for API errors

### Export Doesn't Include Checklist

- **Check**: Playbook export integration is complete
- **Check**: Checklist export endpoint is called
- **Check**: `formattedText` is included in Playbook

### Analytics Events Not Firing

- **Check**: PostHog is configured (`NEXT_PUBLIC_POSTHOG_KEY`)
- **Check**: Analytics service is initialized
- **Check**: Events are scrubbed before transmission
- **Check**: Browser console for errors

## Performance

### Targets

- **Modal Load**: < 2 seconds (SC-001)
- **UI Feedback**: < 500ms (SC-002)
- **Export**: < 5 seconds (SC-006)

### Optimization Tips

- Use database indexes (already created)
- Fetch templates and completions in parallel
- Use optimistic UI updates for instant feedback
- Cache templates if needed (future optimization)

## Security

### PII Scrubbing

All analytics events must be scrubbed:
```typescript
import { DataScrubber } from '@/shared/security/data-scrubber';

const scrubbed = DataScrubber.scrubObject(properties);
```

### Row Level Security

- Users can only access their own completions
- RLS policies enforce this at the database level
- API endpoints verify user identity

## Next Steps

1. Complete Playbook export integration
2. Add comprehensive test coverage
3. Monitor analytics events in PostHog
4. Gather user feedback for improvements

## Resources

- **Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Specification**: [contracts/api-specification.md](./contracts/api-specification.md)
- **Research**: [research.md](./research.md)
