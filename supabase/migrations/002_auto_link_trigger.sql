-- ============================================================
-- AUTO-LINK TRIGGER
-- When a session is logged → auto-updates student_topic_progress
-- Run AFTER 001_schema.sql
-- ============================================================

CREATE OR REPLACE FUNCTION update_student_topic_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_topic_id UUID;
  new_status TEXT;
BEGIN
  -- Determine status based on comprehension rating
  IF NEW.comprehension = 'mastered' THEN
    new_status := 'mastered';
  ELSE
    new_status := 'covered';
  END IF;

  -- Loop through each topic covered in this session
  FOREACH v_topic_id IN ARRAY NEW.topics_covered
  LOOP
    INSERT INTO student_topic_progress (
      student_id,
      topic_id,
      status,
      last_session_id,
      last_covered_date,
      times_covered,
      latest_comprehension,
      updated_at
    )
    VALUES (
      NEW.student_id,
      v_topic_id,
      new_status,
      NEW.id,
      NEW.session_date,
      1,
      NEW.comprehension,
      NOW()
    )
    ON CONFLICT (student_id, topic_id) DO UPDATE SET
      -- Only upgrade status (not_started → in_progress → covered → mastered)
      status = CASE
        WHEN student_topic_progress.status = 'mastered' THEN 'mastered'
        WHEN EXCLUDED.status = 'mastered' THEN 'mastered'
        ELSE EXCLUDED.status
      END,
      last_session_id = EXCLUDED.last_session_id,
      last_covered_date = EXCLUDED.last_covered_date,
      times_covered = student_topic_progress.times_covered + 1,
      latest_comprehension = EXCLUDED.latest_comprehension,
      updated_at = NOW();
  END LOOP;

  -- Refresh student updated_at
  UPDATE students
  SET updated_at = NOW()
  WHERE id = NEW.student_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_session_logged
  AFTER INSERT ON session_logs
  FOR EACH ROW EXECUTE FUNCTION update_student_topic_progress();

-- ============================================================
-- UPDATED_AT TRIGGER (reusable)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_progress_updated_at
  BEFORE UPDATE ON student_topic_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
