# Data Model: Micro-Checklists

**Date**: 2025-01-27
**Feature**: Micro-Checklists
**Status**: Complete

## Overview

The Micro-Checklists feature uses two main database tables to store checklist templates (coaching tips) and user completions. The data model follows the existing InterviewApp patterns with Supabase PostgreSQL, Row Level Security (RLS), and generated TypeScript types.

## Entities

### 1. ChecklistTemplate

**Purpose**: Stores coaching tip items organized by category. Templates are shared across all users and define the available checklist items.

**Table**: `public.checklist_templates`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `category` | TEXT | NOT NULL | Category name (e.g., "Communication", "Problem Solving") |
| `item_text` | TEXT | NOT NULL | The checklist item description/coaching tip |
| `display_order` | INTEGER | NOT NULL, DEFAULT 0 | Order to display items within a category |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether this template is active and should be shown |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_checklist_templates_category` on `category`
- `idx_checklist_templates_active` on `is_active` WHERE `is_active = TRUE`

**Relationships**:
- One-to-many with `ChecklistCompletion` (via `template_id`)

**Validation Rules**:
- `category` must match evaluation category names (enforced at application level)
- `item_text` must not be empty
- `display_order` must be >= 0
- `category` and `item_text` combination should be unique (enforced at application level if needed)

**RLS Policies**:
- **SELECT**: Any authenticated user can view active templates (`is_active = TRUE`)
- **INSERT/UPDATE/DELETE**: Admin-only (not exposed via API in current implementation)

**State Transitions**:
- `is_active`: TRUE → FALSE (deactivation, soft delete)
- Templates can be deactivated but completions remain in history

**Domain Entity**:
```typescript
interface ChecklistTemplate {
  id: string;              // UUID
  category: string;        // Category name
  itemText: string;       // Coaching tip text
  displayOrder: number;    // Display order
  isActive: boolean;       // Active status
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Update timestamp
}
```

---

### 2. ChecklistCompletion

**Purpose**: Tracks which checklist items a user has completed for a specific evaluation. Each completion links a user, an evaluation, and a template.

**Table**: `public.checklist_completions`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User who completed the item |
| `evaluation_id` | TEXT | NOT NULL | Evaluation ID (stored as TEXT to avoid FK constraint issues) |
| `template_id` | UUID | NOT NULL, REFERENCES checklist_templates(id) ON DELETE CASCADE | Checklist template that was completed |
| `completed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When the item was completed |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**Indexes**:
- `idx_checklist_completions_user_eval` on (`user_id`, `evaluation_id`)
- `idx_checklist_completions_template` on (`template_id`)

**Unique Constraint**:
- `UNIQUE(user_id, evaluation_id, template_id)` - Ensures a user can only complete each checklist item once per evaluation

**Relationships**:
- Many-to-one with `ChecklistTemplate` (via `template_id`)
- Many-to-one with `User` (via `user_id`, references `auth.users`)
- Many-to-one with `EvaluationResult` (via `evaluation_id`, logical relationship)

**Validation Rules**:
- `user_id` must be a valid UUID from `auth.users`
- `evaluation_id` must be a valid evaluation ID (enforced at application level)
- `template_id` must reference an existing template
- Unique constraint prevents duplicate completions

**RLS Policies**:
- **SELECT**: Users can only view their own completions (`auth.uid() = user_id`)
- **INSERT**: Users can only insert their own completions (`auth.uid() = user_id`)
- **DELETE**: Users can only delete their own completions (`auth.uid() = user_id`)
- **UPDATE**: Not used (completions are immutable once created)

**State Transitions**:
- None - completions are created and deleted, not updated
- Completion is created when user checks an item
- Completion is deleted when user unchecks an item

**Domain Entity**:
```typescript
interface ChecklistCompletion {
  id: string;              // UUID
  userId: string;          // User UUID
  evaluationId: string;    // Evaluation ID
  templateId: string;      // Template UUID
  completedAt: Date;       // Completion timestamp
  createdAt: Date;         // Record creation timestamp
}
```

---

### 3. EvaluationResult (Existing)

**Purpose**: The parent entity that contains evaluation feedback. Checklist completions are associated with evaluations.

**Table**: `public.evaluation_results` (existing)

**Relevant Fields**:
- `id` (TEXT/UUID) - Used as `evaluation_id` in checklist_completions
- `delivery_note` (TEXT) - Optional coaching note to include in Playbook export with completed checklist items

**Relationship**:
- One-to-many with `ChecklistCompletion` (logical relationship via `evaluation_id`)

---

## Data Access Patterns

### Query Patterns

1. **Get Checklist Items for Category**:
   ```sql
   SELECT * FROM checklist_templates
   WHERE category = $1 AND is_active = TRUE
   ORDER BY display_order ASC;
   ```

2. **Get User Completions for Evaluation**:
   ```sql
   SELECT template_id FROM checklist_completions
   WHERE user_id = $1 AND evaluation_id = $2;
   ```

3. **Get Completed Items with Templates**:
   ```sql
   SELECT
     cc.*,
     ct.category,
     ct.item_text,
     ct.display_order
   FROM checklist_completions cc
   JOIN checklist_templates ct ON cc.template_id = ct.id
   WHERE cc.user_id = $1 AND cc.evaluation_id = $2
   ORDER BY cc.completed_at ASC;
   ```

### Mutation Patterns

1. **Create Completion**:
   ```sql
   INSERT INTO checklist_completions (user_id, evaluation_id, template_id)
   VALUES ($1, $2, $3)
   ON CONFLICT (user_id, evaluation_id, template_id) DO NOTHING;
   ```

2. **Delete Completion**:
   ```sql
   DELETE FROM checklist_completions
   WHERE user_id = $1 AND evaluation_id = $2 AND template_id = $3;
   ```

---

## Type Safety

### Generated Types

The database types are generated from Supabase schema using:
```bash
pnpm run update-types
```

**Usage**:
```typescript
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

// Row type
type ChecklistTemplate = Tables<"checklist_templates">;
type ChecklistCompletion = Tables<"checklist_completions">;

// Insert type
type ChecklistCompletionInsert = TablesInsert<"checklist_completions">;

// Update type (not used for completions, but available for templates)
type ChecklistTemplateUpdate = TablesUpdate<"checklist_templates">;
```

**Important**: Always use generated types, never manually define interfaces that duplicate database structures.

---

## Data Integrity

### Constraints

1. **Foreign Key Constraints**:
   - `checklist_completions.user_id` → `auth.users(id)` with CASCADE delete
   - `checklist_completions.template_id` → `checklist_templates(id)` with CASCADE delete

2. **Unique Constraints**:
   - `(user_id, evaluation_id, template_id)` on `checklist_completions`

3. **Check Constraints**:
   - None currently, but application-level validation ensures:
     - `display_order >= 0`
     - `item_text` is not empty
     - `category` matches evaluation category names

### Cascading Behavior

- If a user is deleted, their checklist completions are automatically deleted (CASCADE)
- If a template is deleted, all related completions are automatically deleted (CASCADE)
- If an evaluation is deleted, completions remain (no FK constraint, evaluation_id is TEXT)

---

## Performance Considerations

### Indexes

1. **Category Lookup**: `idx_checklist_templates_category` enables fast filtering by category
2. **Active Templates**: `idx_checklist_templates_active` (partial index) enables fast filtering of active templates
3. **User Completions**: `idx_checklist_completions_user_eval` enables fast lookup of user's completions for an evaluation
4. **Template Lookup**: `idx_checklist_completions_template` enables fast joins with templates

### Query Optimization

- Use `SELECT` with specific columns, not `SELECT *`
- Use `ORDER BY` with indexed columns
- Use `WHERE` clauses that leverage indexes
- Consider pagination if checklist items grow large (future optimization)

---

## Migration History

**Migration**: `20251206010000_create_checklist_tables.sql`

**Changes**:
- Created `checklist_templates` table
- Created `checklist_completions` table
- Created indexes
- Created RLS policies
- Created trigger for `updated_at` timestamp
- Seeded default checklist templates

**Type Regeneration**: After migration, run `pnpm run update-types` to regenerate TypeScript types.

---

## Future Considerations

### Potential Enhancements

1. **Soft Delete for Templates**: Currently uses `is_active` flag, could add `deleted_at` timestamp
2. **Template Versioning**: Track changes to templates over time
3. **Completion History**: Track when items were completed/uncompleted (currently only tracks completion)
4. **Bulk Operations**: Support bulk completion/uncompletion
5. **Template Categories**: Support hierarchical categories or tags

### Scalability

- Current design supports thousands of templates and millions of completions
- Indexes ensure query performance at scale
- RLS policies ensure security at scale
- Consider partitioning `checklist_completions` by `evaluation_id` if it grows very large (future optimization)
