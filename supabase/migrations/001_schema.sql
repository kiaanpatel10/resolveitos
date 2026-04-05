-- ============================================================
-- ResolveIt OS — Database Schema
-- Run this in Supabase SQL Editor: supabase.com → SQL Editor
-- ============================================================

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'tutor')),
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tutor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  year_group INTEGER NOT NULL CHECK (year_group BETWEEN 7 AND 13),
  exam_board TEXT NOT NULL CHECK (exam_board IN ('AQA', 'Edexcel', 'OCR')),
  qualification TEXT NOT NULL CHECK (qualification IN ('GCSE', 'A-Level')),
  tier TEXT CHECK (tier IN ('Foundation', 'Higher', 'N/A')),
  current_grade TEXT,
  target_grade TEXT NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'churned')),
  assigned_tutor_id UUID REFERENCES profiles(id),
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TOPICS (curriculum backbone)
-- ============================================================
CREATE TABLE topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  qualification TEXT NOT NULL,
  exam_board TEXT NOT NULL,
  tier TEXT,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  estimated_sessions INTEGER DEFAULT 1,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SESSION LOGS
-- ============================================================
CREATE TABLE session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID REFERENCES profiles(id) NOT NULL,
  student_id UUID REFERENCES students(id) NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_type TEXT DEFAULT 'regular' CHECK (session_type IN ('regular', 'mock_review', 'diagnostic', 'revision')),
  duration_minutes INTEGER DEFAULT 60,
  topics_covered UUID[] NOT NULL,
  student_engagement TEXT CHECK (student_engagement IN ('excellent', 'good', 'average', 'poor')),
  comprehension TEXT CHECK (comprehension IN ('mastered', 'confident', 'developing', 'struggling')),
  session_notes TEXT,
  homework_set TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDENT TOPIC PROGRESS (auto-updated by trigger)
-- ============================================================
CREATE TABLE student_topic_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) NOT NULL,
  topic_id UUID REFERENCES topics(id) NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'covered', 'mastered')),
  last_session_id UUID REFERENCES session_logs(id),
  last_covered_date DATE,
  times_covered INTEGER DEFAULT 0,
  latest_comprehension TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, topic_id)
);

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'worksheet' CHECK (file_type IN ('worksheet', 'past_paper', 'mark_scheme', 'notes', 'video', 'other')),
  topic_id UUID REFERENCES topics(id),
  qualification TEXT,
  exam_board TEXT,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSESSMENTS
-- ============================================================
CREATE TABLE assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('diagnostic', 'mock', 'topic_test')),
  title TEXT NOT NULL,
  date_taken DATE NOT NULL,
  score DECIMAL,
  max_score DECIMAL,
  grade TEXT,
  topics_tested UUID[],
  notes TEXT,
  logged_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
