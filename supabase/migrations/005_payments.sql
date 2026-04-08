-- ─── Phase 3: Payments & Revenue ─────────────────────────────────────────────

-- 1. Add payment fields to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS payment_status TEXT
    CHECK (payment_status IN ('paid', 'overdue', 'trial', 'free'))
    DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id    UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  amount        DECIMAL(10, 2) NOT NULL,
  status        TEXT CHECK (status IN ('draft', 'sent', 'paid', 'overdue')) DEFAULT 'draft' NOT NULL,
  due_date      DATE NOT NULL,
  paid_date     DATE,
  stripe_invoice_id TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to invoices"
  ON invoices FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tutors can view invoices for their own students
CREATE POLICY "Tutors can view invoices for their students"
  ON invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = invoices.student_id
        AND students.assigned_tutor_id = auth.uid()
    )
  );
