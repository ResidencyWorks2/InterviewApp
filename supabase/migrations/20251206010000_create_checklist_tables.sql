-- Migration: Create Micro-Checklists tables for coaching moments
-- This enables users to check off coaching items for each evaluation category

-- Table: checklist_templates
-- Stores the template checklist items for each category (e.g., "Conciseness", "Examples", etc.)
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- e.g., "Conciseness", "Examples", "Signposting", etc.
    item_text TEXT NOT NULL, -- The checklist item description
    display_order INTEGER NOT NULL DEFAULT 0, -- Order to display items within a category
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: checklist_completions
-- Tracks which checklist items a user has completed for a specific evaluation
CREATE TABLE IF NOT EXISTS public.checklist_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    evaluation_id TEXT NOT NULL, -- Store as TEXT to avoid FK constraint issues with evaluation_results schema
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure a user can only complete each checklist item once per evaluation
    UNIQUE(user_id, evaluation_id, template_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_checklist_templates_category ON public.checklist_templates(category);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_active ON public.checklist_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_checklist_completions_user_eval ON public.checklist_completions(user_id, evaluation_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_template ON public.checklist_completions(template_id);

-- RLS Policies

-- checklist_templates: Anyone can view active templates (they're coaching tips, not sensitive)
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active checklist templates" ON public.checklist_templates;
CREATE POLICY "Anyone can view active checklist templates"
ON public.checklist_templates
FOR SELECT
TO authenticated
USING (is_active = TRUE);

-- checklist_completions: Users can only view and manage their own completions
ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own checklist completions" ON public.checklist_completions;
CREATE POLICY "Users can view their own checklist completions"
ON public.checklist_completions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own checklist completions" ON public.checklist_completions;
CREATE POLICY "Users can insert their own checklist completions"
ON public.checklist_completions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own checklist completions" ON public.checklist_completions;
CREATE POLICY "Users can delete their own checklist completions"
ON public.checklist_completions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_checklist_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_checklist_templates_updated_at_trigger ON public.checklist_templates;
CREATE TRIGGER update_checklist_templates_updated_at_trigger
BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW
EXECUTE FUNCTION update_checklist_templates_updated_at();

-- Seed default checklist templates for common categories
INSERT INTO public.checklist_templates (category, item_text, display_order) VALUES
-- Conciseness
('Conciseness', 'Keep sentences under 20 words where possible', 1),
('Conciseness', 'Remove filler words (um, like, basically, etc.)', 2),
('Conciseness', 'Lead with your main point in the first 10 seconds', 3),
('Conciseness', 'Cut redundant phrases and get to the point', 4),

-- Examples
('Examples', 'Use specific, concrete examples rather than generalizations', 1),
('Examples', 'Include numbers or measurable outcomes when possible', 2),
('Examples', 'Keep examples brief (15-30 seconds)', 3),
('Examples', 'Ensure examples directly support your main argument', 4),

-- Signposting
('Signposting', 'State your answer structure up front (First, Then, Finally)', 1),
('Signposting', 'Use transition phrases between sections', 2),
('Signposting', 'Conclude with a clear summary of key points', 3),
('Signposting', 'Number your points explicitly (1, 2, 3)', 4),

-- Pace
('Pace', 'Aim for 130-160 words per minute', 1),
('Pace', 'Pause for 1-2 seconds between major points', 2),
('Pace', 'Vary your pace to emphasize important ideas', 3),
('Pace', 'Practice with a timer to internalize pacing', 4),

-- Filler words
('Filler words', 'Replace "um" with brief silence', 1),
('Filler words', 'Practice pausing instead of using "like"', 2),
('Filler words', 'Record yourself and count fillers per minute', 3),
('Filler words', 'Aim for under 3 fillers per minute', 4),

-- Relevance
('Relevance', 'Restate the question in your opening sentence', 1),
('Relevance', 'Tie each point back to the core question', 2),
('Relevance', 'Avoid tangents - stay focused on the prompt', 3),
('Relevance', 'End by directly answering the question asked', 4),

-- Confidence
('Confidence', 'Use active voice ("I implemented" vs "It was implemented")', 1),
('Confidence', 'Avoid hedging phrases like "I think" or "maybe"', 2),
('Confidence', 'Speak in declarative statements when appropriate', 3),
('Confidence', 'Practice power posing before answering', 4)
ON CONFLICT DO NOTHING;

-- Add delivery_note column to evaluation_results for export
-- This will store any additional coaching notes to include in the Playbook export
-- Using IF NOT EXISTS to handle cases where the column might already exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'evaluation_results'
    ) THEN
        ALTER TABLE public.evaluation_results
        ADD COLUMN IF NOT EXISTS delivery_note TEXT;

        COMMENT ON COLUMN public.evaluation_results.delivery_note IS 'Optional coaching note to include in Playbook export with completed checklist items';
    END IF;
END $$;
