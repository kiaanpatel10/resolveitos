-- ─── Phase 5: Scheduling System ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schedule (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id       UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  day_of_week      TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time       TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  recurring        BOOLEAN NOT NULL DEFAULT true,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','paused')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to schedule"
  ON schedule FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tutors can view their own schedule entries
CREATE POLICY "Tutors can view their schedule"
  ON schedule FOR SELECT TO authenticated
  USING (tutor_id = auth.uid());

-- Tutors can insert their own schedule entries
CREATE POLICY "Tutors can insert their schedule"
  ON schedule FOR INSERT TO authenticated
  WITH CHECK (tutor_id = auth.uid());

-- Tutors can update their own schedule entries
CREATE POLICY "Tutors can update their schedule"
  ON schedule FOR UPDATE TO authenticated
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());
