-- Migration to add drill_specialty field to content pack questions
-- Date: 2025-12-06
-- Feature: Specialty Layer (Signoff requirement 2.2)

-- Note: The content_packs table stores content as JSONB, so no schema changes are needed.
-- This migration serves as documentation for the drill_specialty field addition.

-- Expected Content Pack Structure (JSONB) - UPDATED:
-- {
--   "evaluations": [
--     {
--       "id": "string",
--       "title": "string",
--       "description": "string",
--       "difficulty": "beginner" | "intermediate" | "hard",
--       "estimatedMinutes": number,
--       "criteria": [...],
--       "questions": [
--         {
--           "id": "string",
--           "text": "string",
--           "type": "text" | "audio",
--           "difficulty": "beginner" | "intermediate" | "hard",
--           "estimatedMinutes": number,
--           "drill_specialty": "string"                      -- NEW FIELD
--         }
--       ]
--     }
--   ],
--   "categories": [...]
-- }

-- The drill_specialty field enables specialty-based question filtering.
-- Common specialty values include:
--   - "general": General questions applicable across specialties
--   - "pediatrics": Pediatric medicine questions
--   - "cardiology": Cardiology-specific questions
--   - "emergency": Emergency medicine questions
--   - "surgery": Surgical questions
--   - "internal_medicine": Internal medicine questions
--   - "psychiatry": Psychiatry-specific questions
--   - "obstetrics": Obstetrics and gynecology questions
--   - "neurology": Neurology-specific questions
--   - "radiology": Radiology-specific questions
--
-- Specialty filtering behavior:
--   - Questions with drill_specialty matching the filter should represent 70-80% of results
--   - Questions without drill_specialty or with "general" are included as filler
--   - This ensures a mix of specialty-specific and general questions

-- Update the column comment to document the enhanced schema
COMMENT ON COLUMN content_packs.content IS
'JSONB content structure. Enhanced schema includes:
- evaluations[].difficulty: "beginner" | "intermediate" | "hard"
- evaluations[].estimatedMinutes: number (total time for all questions)
- evaluations[].questions[].difficulty: "beginner" | "intermediate" | "hard"
- evaluations[].questions[].estimatedMinutes: number (time per question)
- evaluations[].questions[].drill_specialty: string (e.g., "pediatrics", "cardiology", "general")
  * Used for specialty-based filtering
  * Target: 70-80% specialty match in filtered results
  * Questions without specialty default to "general"';

-- No actual schema changes needed since content is stored as JSONB
-- The validation will be handled by the application layer (Zod schemas and API)

-- Create a helper function to filter questions by specialty
-- This function returns questions matching a specialty with proper ratio (70-80% match)
CREATE OR REPLACE FUNCTION get_questions_by_specialty(
    target_specialty TEXT,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    question_id TEXT,
    question_text TEXT,
    question_type TEXT,
    question_specialty TEXT,
    evaluation_id TEXT,
    evaluation_title TEXT
) AS $$
DECLARE
    target_count INTEGER;
    general_count INTEGER;
BEGIN
    -- Calculate target counts: 75% specialty, 25% general
    target_count := FLOOR(limit_count * 0.75);
    general_count := limit_count - target_count;

    RETURN QUERY
    WITH active_pack AS (
        SELECT content
        FROM public.content_packs
        WHERE status = 'activated'
        LIMIT 1
    ),
    all_questions AS (
        SELECT
            jsonb_array_elements(e.value->'questions')->>'id' AS question_id,
            jsonb_array_elements(e.value->'questions')->>'text' AS question_text,
            jsonb_array_elements(e.value->'questions')->>'type' AS question_type,
            COALESCE(
                jsonb_array_elements(e.value->'questions')->>'drill_specialty',
                'general'
            ) AS question_specialty,
            e.value->>'id' AS evaluation_id,
            e.value->>'title' AS evaluation_title
        FROM active_pack,
            LATERAL jsonb_array_elements(content->'evaluations') AS e(value)
    ),
    specialty_questions AS (
        SELECT *
        FROM all_questions
        WHERE question_specialty = target_specialty
        ORDER BY RANDOM()
        LIMIT target_count
    ),
    general_questions AS (
        SELECT *
        FROM all_questions
        WHERE question_specialty IN ('general', '')
           OR question_specialty IS NULL
        ORDER BY RANDOM()
        LIMIT general_count
    )
    SELECT * FROM specialty_questions
    UNION ALL
    SELECT * FROM general_questions
    ORDER BY RANDOM();
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION get_questions_by_specialty(TEXT, INTEGER) IS
'Returns questions filtered by specialty with proper ratio:
- 70-80% questions matching the target specialty
- 20-30% general questions as filler
- Default limit is 10 questions';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_questions_by_specialty(TEXT, INTEGER) TO authenticated;
