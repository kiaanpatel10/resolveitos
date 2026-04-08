-- ─── Phase 5: Tutor Training Hub ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_modules (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'document' CHECK (type IN ('sop','video','document')),
  content_url TEXT,
  content     TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  required    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutor_training_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  module_id    UUID REFERENCES training_modules(id) ON DELETE CASCADE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tutor_id, module_id)
);

-- RLS: training_modules visible to all authenticated users; only admins can write
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view training modules"
  ON training_modules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage training modules"
  ON training_modules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS: tutors can see and update their own progress; admins see everything
ALTER TABLE tutor_training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to training progress"
  ON tutor_training_progress FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Tutors can view their own progress"
  ON tutor_training_progress FOR SELECT TO authenticated
  USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can upsert their own progress"
  ON tutor_training_progress FOR INSERT TO authenticated
  WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can update their own progress"
  ON tutor_training_progress FOR UPDATE TO authenticated
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

-- ─── Seed: Example Training Modules ──────────────────────────────────────────

INSERT INTO training_modules (title, description, type, content_url, content, order_index, required) VALUES
(
  'Session Delivery SOP',
  'Standard operating procedure for delivering a high-quality tutoring session from start to finish.',
  'sop',
  NULL,
  '# Session Delivery SOP

## Before the Session
- Review your student''s progress dashboard 5 minutes before the session starts.
- Check which topics were last covered and their comprehension rating.
- Prepare 2–3 topic options based on the student''s weakest areas.

## Opening (5 mins)
- Greet the student warmly and ask how they''re feeling about maths this week.
- Recap the previous session: *"Last time we covered X — how did you find the homework?"*
- Set the agenda for today clearly: *"Today we''re going to tackle Y and Z."*

## Core Session
- Use the **explain, example, practice** framework for each new topic.
- Ask open questions rather than yes/no questions to check understanding.
- Adapt pace to the student — slow down when they''re struggling, increase pace when confident.
- Keep energy high: celebrate small wins.

## Closing (5 mins)
- Summarise what was covered and reinforce key takeaways.
- Set homework (specific, achievable, relevant to today''s topics).
- Preview next session: build anticipation.

## After the Session
- Log the session in ResolveIt OS within 30 minutes while it''s fresh.
- Rate engagement and comprehension honestly — this data drives the at-risk system.
- Add session notes if anything unusual happened or a breakthrough was achieved.',
  1,
  true
),
(
  'How to Log a Session',
  'Step-by-step guide to logging sessions correctly in ResolveIt OS so student progress is tracked accurately.',
  'sop',
  NULL,
  '# How to Log a Session

## Why Logging Matters
Every session log automatically updates the student''s topic progress tracker. Admins use this data to spot at-risk students and track your performance. Accurate logs = accurate data.

## Step-by-Step

1. **Go to Log Session** — click "Log Session" in the navigation bar.

2. **Select the student** — choose from your assigned students. The topic list will auto-filter to their curriculum.

3. **Set the date** — defaults to today. Change it if you''re logging a session from a previous day.

4. **Choose session type:**
   - *Regular* — standard curriculum session
   - *Mock Review* — going through a past paper
   - *Diagnostic* — initial assessment / gap analysis
   - *Revision* — pre-exam cramming

5. **Set duration** — use the slider (30–120 mins in 15-min increments).

6. **Select topics covered** — search or browse by category. Select every topic you meaningfully covered (even briefly).

7. **Rate engagement** — be honest. Poor ratings trigger the at-risk flag so admins can follow up.

8. **Rate comprehension** — based on the student''s understanding by the end of the session.

9. **Add notes** — optional but highly recommended. Note breakthroughs, struggles, or anything the admin should know.

10. **Set homework** — log exactly what you assigned so it can be followed up next session.

11. **Hit Log Session** — you''ll see a success toast and the student''s progress updates instantly.',
  2,
  true
),
(
  'Communication Standards',
  'Professional communication guidelines for interactions with students, parents, and the admin team.',
  'sop',
  NULL,
  '# Communication Standards

## With Students
- Always be warm, encouraging, and patient.
- Never make a student feel embarrassed for not knowing something.
- Use their name regularly during sessions — it builds rapport.
- Keep WhatsApp/text communication professional and brief. Admin handles parent escalations.

## With Parents
- Respond to parent messages within 24 hours.
- Keep updates positive but honest: *"Jamie is making good progress on algebra, though we''re still working on quadratics."*
- Never promise grade outcomes. Use language like "we''re targeting" or "aiming for".
- Escalate any safeguarding concerns to the admin immediately.

## With the Admin Team
- Log sessions on the day they happen (or within 24 hours max).
- Flag any student welfare concerns promptly via direct message.
- If you need to cancel a session, give as much notice as possible and inform admin.

## Response Times
| Channel | Expected Response |
|---------|-------------------|
| Admin messages | Within 4 hours during business hours |
| Parent messages | Within 24 hours |
| Student messages | Within 12 hours |

## What to Avoid
- Do not share student data with third parties.
- Do not contact students on personal social media.
- Do not make financial arrangements directly with parents — all billing goes through admin.',
  3,
  true
),
(
  'Exam Board Overview',
  'Key differences between AQA, Edexcel, and OCR GCSE and A-Level maths specifications.',
  'sop',
  NULL,
  '# Exam Board Overview

## GCSE Maths

### AQA
- Two tiers: Foundation (grades 1–5) and Higher (grades 4–9).
- 3 papers: 1 non-calculator + 2 calculator.
- Known for clear, straightforward question wording.
- Strong emphasis on problem-solving and multi-step questions.

### Edexcel
- Same tier structure as AQA.
- 3 papers: 1 non-calculator + 2 calculator.
- Questions can have more context/wordy setups.
- Specification is very popular — lots of past papers available.

### OCR
- Two specifications: OCR and OCR (MEI).
- 3 papers but structured differently.
- MEI version has a "problem solving" paper which is more unusual.

## A-Level Maths

All boards follow the same core content (DfE requirement since 2017):
- **Pure Maths** (~67%): Algebra, Calculus, Trigonometry, Vectors, Proof
- **Statistics** (~17%): Data, Probability, Distributions, Hypothesis Testing
- **Mechanics** (~17%): Kinematics, Forces, Moments

### Key Differences
| Feature | AQA | Edexcel | OCR |
|---------|-----|---------|-----|
| Large Data Set | Yes | Yes | Yes |
| Proof emphasis | High | Medium | Medium |
| Calculator allowed | All but Paper 1 | All but Paper 1 | All but Paper 1 |

## Tips for Tutors
- Always check which board your student is on before teaching — some topics differ slightly.
- Past papers are your best resource. Focus on the student''s specific board.
- For GCSE Foundation students, ensure they master grades 1–4 topics thoroughly before attempting grade 5.',
  4,
  false
)
ON CONFLICT DO NOTHING;
