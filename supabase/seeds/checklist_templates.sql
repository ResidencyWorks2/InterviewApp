-- Checklist Templates Seed Data
-- This file seeds checklist_templates with coaching tips for evaluation categories
-- Categories match the actual evaluation categories used in the app
--
-- Primary categories (from EvaluationCategories interface):
-- - Clarity (maps to "clarity" in evaluation results)
-- - Structure (maps to "structure" in evaluation results)
-- - Content (maps to "content" in evaluation results)
-- - Delivery (maps to "delivery" in evaluation results)
--
-- The category matching algorithm (FR-016) will handle case-insensitive matching
-- and fuzzy matching for variations like "Communication" -> "Clarity"
--
-- Usage:
--   - Run `supabase db seed` to apply this seed file
--   - Or include in `supabase db reset` to reset and seed
--   - Uses ON CONFLICT DO NOTHING for idempotency

-- Insert checklist templates for primary evaluation categories
INSERT INTO public.checklist_templates (category, item_text, display_order, is_active) VALUES
-- Clarity (from evaluation.categories.clarity)
('Clarity', 'Speak clearly and enunciate words properly', 1, true),
('Clarity', 'Use simple, direct language instead of jargon when possible', 2, true),
('Clarity', 'Break down complex ideas into smaller, understandable parts', 3, true),
('Clarity', 'Use concrete examples to illustrate abstract concepts', 4, true),
('Clarity', 'Avoid ambiguous phrases - be specific and precise', 5, true),
('Clarity', 'Pause between major points to let ideas sink in', 6, true),

-- Structure (from evaluation.categories.structure)
('Structure', 'Start with a clear introduction that previews your main points', 1, true),
('Structure', 'Organize your answer logically (chronological, problem-solution, etc.)', 2, true),
('Structure', 'Use signposting language (First, Second, Finally)', 3, true),
('Structure', 'Connect each point back to the main question or theme', 4, true),
('Structure', 'End with a concise summary of your key points', 5, true),
('Structure', 'Maintain consistent structure throughout your response', 6, true),

-- Content (from evaluation.categories.content)
('Content', 'Provide specific, relevant examples from your experience', 1, true),
('Content', 'Include quantifiable results or measurable outcomes when possible', 2, true),
('Content', 'Demonstrate deep understanding, not just surface knowledge', 3, true),
('Content', 'Address all aspects of the question comprehensively', 4, true),
('Content', 'Show how your experience relates to the role or question', 5, true),
('Content', 'Balance detail with conciseness - include what matters most', 6, true),

-- Delivery (from evaluation.categories.delivery)
('Delivery', 'Maintain confident, steady pace (130-160 words per minute)', 1, true),
('Delivery', 'Use vocal variety to emphasize important points', 2, true),
('Delivery', 'Minimize filler words (um, like, uh) - aim for under 3 per minute', 3, true),
('Delivery', 'Use appropriate pauses to separate ideas', 4, true),
('Delivery', 'Project confidence through tone and energy', 5, true),
('Delivery', 'Practice active listening cues if in a conversation format', 6, true)

ON CONFLICT DO NOTHING;

-- Also seed some common alternative category names that might appear in category_flags
-- These will be matched via the category matching algorithm
INSERT INTO public.checklist_templates (category, item_text, display_order, is_active) VALUES
-- Communication (maps to Clarity)
('Communication', 'Articulate your thoughts clearly and concisely', 1, true),
('Communication', 'Adapt your communication style to your audience', 2, true),
('Communication', 'Listen actively and respond thoughtfully', 3, true),
('Communication', 'Use body language and tone to reinforce your message', 4, true),

-- Problem Solving (maps to Structure/Content)
('Problem Solving', 'Break down complex problems into manageable steps', 1, true),
('Problem Solving', 'Identify root causes before proposing solutions', 2, true),
('Problem Solving', 'Consider multiple approaches and trade-offs', 3, true),
('Problem Solving', 'Explain your reasoning process clearly', 4, true),

-- Technical Accuracy (maps to Content)
('Technical Accuracy', 'Verify facts and technical details before stating them', 1, true),
('Technical Accuracy', 'Acknowledge uncertainty when appropriate', 2, true),
('Technical Accuracy', 'Provide accurate technical explanations', 3, true),
('Technical Accuracy', 'Cite relevant standards or best practices when applicable', 4, true)

ON CONFLICT DO NOTHING;
