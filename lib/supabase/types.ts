export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: "admin" | "tutor";
          email: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: "admin" | "tutor";
          email: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: "admin" | "tutor";
          email?: string;
          phone?: string | null;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          full_name: string;
          year_group: number;
          exam_board: "AQA" | "Edexcel" | "OCR";
          qualification: "GCSE" | "A-Level";
          tier: "Foundation" | "Higher" | "N/A" | null;
          current_grade: string | null;
          target_grade: string;
          start_date: string;
          status: "active" | "paused" | "churned";
          assigned_tutor_id: string | null;
          parent_name: string | null;
          parent_email: string | null;
          parent_phone: string | null;
          notes: string | null;
          payment_status: "paid" | "overdue" | "trial" | "free" | null;
          monthly_rate: number | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          year_group: number;
          exam_board: "AQA" | "Edexcel" | "OCR";
          qualification: "GCSE" | "A-Level";
          tier?: "Foundation" | "Higher" | "N/A" | null;
          current_grade?: string | null;
          target_grade: string;
          start_date?: string;
          status?: "active" | "paused" | "churned";
          assigned_tutor_id?: string | null;
          parent_name?: string | null;
          parent_email?: string | null;
          parent_phone?: string | null;
          notes?: string | null;
          payment_status?: "paid" | "overdue" | "trial" | "free" | null;
          monthly_rate?: number | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          year_group?: number;
          exam_board?: "AQA" | "Edexcel" | "OCR";
          qualification?: "GCSE" | "A-Level";
          tier?: "Foundation" | "Higher" | "N/A" | null;
          current_grade?: string | null;
          target_grade?: string;
          start_date?: string;
          status?: "active" | "paused" | "churned";
          assigned_tutor_id?: string | null;
          parent_name?: string | null;
          parent_email?: string | null;
          parent_phone?: string | null;
          notes?: string | null;
          payment_status?: "paid" | "overdue" | "trial" | "free" | null;
          monthly_rate?: number | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      topics: {
        Row: {
          id: string;
          name: string;
          category: string;
          qualification: string;
          exam_board: string;
          tier: string | null;
          difficulty: number | null;
          estimated_sessions: number;
          order_index: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          qualification: string;
          exam_board: string;
          tier?: string | null;
          difficulty?: number | null;
          estimated_sessions?: number;
          order_index?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          qualification?: string;
          exam_board?: string;
          tier?: string | null;
          difficulty?: number | null;
          estimated_sessions?: number;
          order_index?: number | null;
          created_at?: string;
        };
      };
      session_logs: {
        Row: {
          id: string;
          tutor_id: string;
          student_id: string;
          student_ids: string[] | null;
          session_date: string;
          session_type: "regular" | "mock_review" | "diagnostic" | "revision";
          duration_minutes: number;
          topics_covered: string[];
          student_engagement: "excellent" | "good" | "average" | "poor" | null;
          comprehension:
            | "mastered"
            | "confident"
            | "developing"
            | "struggling"
            | null;
          session_notes: string | null;
          homework_set: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tutor_id: string;
          student_id: string;
          student_ids?: string[] | null;
          session_date?: string;
          session_type?: "regular" | "mock_review" | "diagnostic" | "revision";
          duration_minutes?: number;
          topics_covered: string[];
          student_engagement?:
            | "excellent"
            | "good"
            | "average"
            | "poor"
            | null;
          comprehension?:
            | "mastered"
            | "confident"
            | "developing"
            | "struggling"
            | null;
          session_notes?: string | null;
          homework_set?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tutor_id?: string;
          student_id?: string;
          student_ids?: string[] | null;
          session_date?: string;
          session_type?: "regular" | "mock_review" | "diagnostic" | "revision";
          duration_minutes?: number;
          topics_covered?: string[];
          student_engagement?:
            | "excellent"
            | "good"
            | "average"
            | "poor"
            | null;
          comprehension?:
            | "mastered"
            | "confident"
            | "developing"
            | "struggling"
            | null;
          session_notes?: string | null;
          homework_set?: string | null;
          created_at?: string;
        };
      };
      student_topic_progress: {
        Row: {
          id: string;
          student_id: string;
          topic_id: string;
          status: "not_started" | "in_progress" | "covered" | "mastered";
          last_session_id: string | null;
          last_covered_date: string | null;
          times_covered: number;
          latest_comprehension: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          topic_id: string;
          status?: "not_started" | "in_progress" | "covered" | "mastered";
          last_session_id?: string | null;
          last_covered_date?: string | null;
          times_covered?: number;
          latest_comprehension?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          topic_id?: string;
          status?: "not_started" | "in_progress" | "covered" | "mastered";
          last_session_id?: string | null;
          last_covered_date?: string | null;
          times_covered?: number;
          latest_comprehension?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      resources: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          file_url: string;
          file_type:
            | "worksheet"
            | "past_paper"
            | "mark_scheme"
            | "notes"
            | "video"
            | "other";
          topic_id: string | null;
          qualification: string | null;
          exam_board: string | null;
          difficulty: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          file_url: string;
          file_type?:
            | "worksheet"
            | "past_paper"
            | "mark_scheme"
            | "notes"
            | "video"
            | "other";
          topic_id?: string | null;
          qualification?: string | null;
          exam_board?: string | null;
          difficulty?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          file_url?: string;
          file_type?:
            | "worksheet"
            | "past_paper"
            | "mark_scheme"
            | "notes"
            | "video"
            | "other";
          topic_id?: string | null;
          qualification?: string | null;
          exam_board?: string | null;
          difficulty?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
      };
      assessments: {
        Row: {
          id: string;
          student_id: string;
          type: "diagnostic" | "mock" | "topic_test";
          title: string;
          date_taken: string;
          score: number | null;
          max_score: number | null;
          grade: string | null;
          topics_tested: string[] | null;
          notes: string | null;
          logged_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          type: "diagnostic" | "mock" | "topic_test";
          title: string;
          date_taken: string;
          score?: number | null;
          max_score?: number | null;
          grade?: string | null;
          topics_tested?: string[] | null;
          notes?: string | null;
          logged_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          type?: "diagnostic" | "mock" | "topic_test";
          title?: string;
          date_taken?: string;
          score?: number | null;
          max_score?: number | null;
          grade?: string | null;
          topics_tested?: string[] | null;
          notes?: string | null;
          logged_by?: string | null;
          created_at?: string;
        };
      };
      schedule: {
        Row: {
          id: string;
          tutor_id: string;
          student_id: string;
          day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
          start_time: string;
          duration_minutes: number;
          recurring: boolean;
          status: "active" | "cancelled" | "paused";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tutor_id: string;
          student_id: string;
          day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
          start_time: string;
          duration_minutes?: number;
          recurring?: boolean;
          status?: "active" | "cancelled" | "paused";
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tutor_id?: string;
          student_id?: string;
          day_of_week?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
          start_time?: string;
          duration_minutes?: number;
          recurring?: boolean;
          status?: "active" | "cancelled" | "paused";
          notes?: string | null;
          created_at?: string;
        };
      };
      training_modules: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: "sop" | "video" | "document";
          content_url: string | null;
          content: string | null;
          order_index: number;
          required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          type?: "sop" | "video" | "document";
          content_url?: string | null;
          content?: string | null;
          order_index?: number;
          required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          type?: "sop" | "video" | "document";
          content_url?: string | null;
          content?: string | null;
          order_index?: number;
          required?: boolean;
          created_at?: string;
        };
      };
      tutor_training_progress: {
        Row: {
          id: string;
          tutor_id: string;
          module_id: string;
          status: "not_started" | "in_progress" | "completed";
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tutor_id: string;
          module_id: string;
          status?: "not_started" | "in_progress" | "completed";
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tutor_id?: string;
          module_id?: string;
          status?: "not_started" | "in_progress" | "completed";
          completed_at?: string | null;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          status: "draft" | "sent" | "paid" | "overdue";
          due_date: string;
          paid_date: string | null;
          stripe_invoice_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          amount: number;
          status?: "draft" | "sent" | "paid" | "overdue";
          due_date: string;
          paid_date?: string | null;
          stripe_invoice_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          amount?: number;
          status?: "draft" | "sent" | "paid" | "overdue";
          due_date?: string;
          paid_date?: string | null;
          stripe_invoice_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Topic = Database["public"]["Tables"]["topics"]["Row"];
export type SessionLog = Database["public"]["Tables"]["session_logs"]["Row"];
export type StudentTopicProgress =
  Database["public"]["Tables"]["student_topic_progress"]["Row"];
export type Resource = Database["public"]["Tables"]["resources"]["Row"];
export type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Schedule = Database["public"]["Tables"]["schedule"]["Row"];
export type TrainingModule = Database["public"]["Tables"]["training_modules"]["Row"];
export type TutorTrainingProgress = Database["public"]["Tables"]["tutor_training_progress"]["Row"];
