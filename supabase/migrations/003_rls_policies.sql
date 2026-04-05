-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Run AFTER 001_schema.sql and 002_auto_link_trigger.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: check if current user is admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- PROFILES policies
-- ============================================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- STUDENTS policies
-- ============================================================
CREATE POLICY "Admins can do everything with students"
  ON students FOR ALL
  USING (is_admin());

CREATE POLICY "Tutors can view their assigned students"
  ON students FOR SELECT
  USING (assigned_tutor_id = auth.uid());

-- ============================================================
-- TOPICS policies (read-only for all authenticated users)
-- ============================================================
CREATE POLICY "All authenticated users can view topics"
  ON topics FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage topics"
  ON topics FOR ALL
  USING (is_admin());

-- ============================================================
-- SESSION LOGS policies
-- ============================================================
CREATE POLICY "Admins can view all session logs"
  ON session_logs FOR ALL
  USING (is_admin());

CREATE POLICY "Tutors can view and create their own session logs"
  ON session_logs FOR SELECT
  USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can insert session logs"
  ON session_logs FOR INSERT
  WITH CHECK (tutor_id = auth.uid());

-- ============================================================
-- STUDENT TOPIC PROGRESS policies
-- ============================================================
CREATE POLICY "Admins can view all progress"
  ON student_topic_progress FOR ALL
  USING (is_admin());

CREATE POLICY "Tutors can view progress for their students"
  ON student_topic_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_topic_progress.student_id
      AND students.assigned_tutor_id = auth.uid()
    )
  );

-- ============================================================
-- RESOURCES policies (read-only for tutors, full for admin)
-- ============================================================
CREATE POLICY "All authenticated users can view resources"
  ON resources FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage resources"
  ON resources FOR ALL
  USING (is_admin());

-- ============================================================
-- ASSESSMENTS policies
-- ============================================================
CREATE POLICY "Admins can manage all assessments"
  ON assessments FOR ALL
  USING (is_admin());

CREATE POLICY "Tutors can view assessments for their students"
  ON assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = assessments.student_id
      AND students.assigned_tutor_id = auth.uid()
    )
  );
