-- ─── Phase 5: Group Session Support ──────────────────────────────────────────

-- Add student_ids column alongside existing student_id (backward compat)
ALTER TABLE session_logs
  ADD COLUMN IF NOT EXISTS student_ids UUID[];

-- Backfill: wrap existing single student_id into the array
UPDATE session_logs
SET student_ids = ARRAY[student_id]
WHERE student_ids IS NULL AND student_id IS NOT NULL;

-- ─── Update trigger to handle both single and group sessions ─────────────────

CREATE OR REPLACE FUNCTION update_student_topic_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_topic_id   UUID;
  v_student_id UUID;
  new_status   TEXT;
  v_students   UUID[];
BEGIN
  -- Determine status from comprehension
  IF NEW.comprehension = 'mastered' THEN
    new_status := 'mastered';
  ELSE
    new_status := 'covered';
  END IF;

  -- Resolve student list: prefer student_ids array, fall back to student_id
  IF NEW.student_ids IS NOT NULL AND array_length(NEW.student_ids, 1) > 0 THEN
    v_students := NEW.student_ids;
  ELSIF NEW.student_id IS NOT NULL THEN
    v_students := ARRAY[NEW.student_id];
  ELSE
    RETURN NEW;
  END IF;

  -- Loop each student
  FOREACH v_student_id IN ARRAY v_students
  LOOP
    -- Loop each topic
    FOREACH v_topic_id IN ARRAY NEW.topics_covered
    LOOP
      INSERT INTO student_topic_progress (
        student_id, topic_id, status, last_session_id,
        last_covered_date, times_covered, latest_comprehension, updated_at
      )
      VALUES (
        v_student_id, v_topic_id, new_status, NEW.id,
        NEW.session_date, 1, NEW.comprehension, NOW()
      )
      ON CONFLICT (student_id, topic_id) DO UPDATE SET
        status = CASE
          WHEN student_topic_progress.status = 'mastered' THEN 'mastered'
          WHEN EXCLUDED.status = 'mastered' THEN 'mastered'
          ELSE EXCLUDED.status
        END,
        last_session_id     = EXCLUDED.last_session_id,
        last_covered_date   = EXCLUDED.last_covered_date,
        times_covered       = student_topic_progress.times_covered + 1,
        latest_comprehension = EXCLUDED.latest_comprehension,
        updated_at          = NOW();
    END LOOP;

    -- Refresh student updated_at
    UPDATE students SET updated_at = NOW() WHERE id = v_student_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
