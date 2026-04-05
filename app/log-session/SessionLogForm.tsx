"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { Student, Topic } from "@/lib/supabase/types";

type StudentRow = Pick<Student, "id" | "full_name" | "exam_board" | "qualification" | "tier" | "status">;
type TopicRow = Pick<Topic, "id" | "name" | "category" | "qualification" | "exam_board" | "tier" | "order_index">;

const SESSION_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "mock_review", label: "Mock Review" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "revision", label: "Revision" },
] as const;

const ENGAGEMENT_OPTIONS = [
  { value: "excellent", label: "Excellent", color: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20" },
  { value: "good", label: "Good", color: "bg-blue-500/10 border-blue-500/40 text-blue-400 hover:bg-blue-500/20" },
  { value: "average", label: "Average", color: "bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20" },
  { value: "poor", label: "Poor", color: "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20" },
] as const;

const COMPREHENSION_OPTIONS = [
  { value: "mastered", label: "Mastered", color: "bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20" },
  { value: "confident", label: "Confident", color: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20" },
  { value: "developing", label: "Developing", color: "bg-blue-500/10 border-blue-500/40 text-blue-400 hover:bg-blue-500/20" },
  { value: "struggling", label: "Struggling", color: "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20" },
] as const;

export default function SessionLogForm({
  students,
  topics,
}: {
  students: StudentRow[];
  topics: TopicRow[];
}) {
  const today = new Date().toISOString().split("T")[0];

  const [studentId, setStudentId] = useState("");
  const [sessionDate, setSessionDate] = useState(today);
  const [sessionType, setSessionType] = useState<string>("regular");
  const [duration, setDuration] = useState(60);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicSearch, setTopicSearch] = useState("");
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [engagement, setEngagement] = useState<string>("");
  const [comprehension, setComprehension] = useState<string>("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [homeworkSet, setHomeworkSet] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Selected student object
  const selectedStudent = students.find((s) => s.id === studentId);

  // Filter topics to match selected student's exam board + qualification
  const filteredTopics = useMemo(() => {
    if (!selectedStudent) return [];
    return topics.filter(
      (t) =>
        t.qualification === selectedStudent.qualification &&
        t.exam_board === selectedStudent.exam_board &&
        (selectedStudent.tier === "N/A" || !selectedStudent.tier || !t.tier || t.tier === selectedStudent.tier)
    );
  }, [selectedStudent, topics]);

  // Further filter by search query
  const searchedTopics = useMemo(() => {
    if (!topicSearch) return filteredTopics;
    const q = topicSearch.toLowerCase();
    return filteredTopics.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [filteredTopics, topicSearch]);

  // Group topics by category
  const groupedTopics = useMemo(() => {
    return searchedTopics.reduce<Record<string, TopicRow[]>>((acc, topic) => {
      if (!acc[topic.category]) acc[topic.category] = [];
      acc[topic.category].push(topic);
      return acc;
    }, {});
  }, [searchedTopics]);

  // Names of selected topics for chips
  const selectedTopicNames = selectedTopics.map(
    (id) => topics.find((t) => t.id === id)?.name ?? id
  );

  function toggleTopic(id: string) {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  // Reset topics when student changes
  function handleStudentChange(id: string) {
    setStudentId(id);
    setSelectedTopics([]);
    setTopicSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!studentId) return toast.error("Please select a student");
    if (selectedTopics.length === 0) return toast.error("Select at least one topic");
    if (!engagement) return toast.error("Please rate student engagement");
    if (!comprehension) return toast.error("Please rate comprehension");

    setSubmitting(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          session_date: sessionDate,
          session_type: sessionType,
          duration_minutes: duration,
          topics_covered: selectedTopics,
          student_engagement: engagement,
          comprehension,
          session_notes: sessionNotes || null,
          homework_set: homeworkSet || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      toast.success("Session logged! Student progress updated.");

      // Reset form
      setStudentId("");
      setSessionDate(today);
      setSessionType("regular");
      setDuration(60);
      setSelectedTopics([]);
      setTopicSearch("");
      setEngagement("");
      setComprehension("");
      setSessionNotes("");
      setHomeworkSet("");
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Student */}
      <Field label="Student" required>
        <select
          value={studentId}
          onChange={(e) => handleStudentChange(e.target.value)}
          className="input-base"
          required
        >
          <option value="">Select a student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name} — {s.qualification} {s.exam_board}
              {s.tier && s.tier !== "N/A" ? ` (${s.tier})` : ""}
            </option>
          ))}
        </select>
      </Field>

      {/* Date + Type */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" required>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="input-base"
            required
          />
        </Field>
        <Field label="Session Type" required>
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
            className="input-base"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Duration */}
      <Field label={`Duration — ${duration} mins`}>
        <input
          type="range"
          min={30}
          max={120}
          step={15}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full accent-[#F97316] cursor-pointer"
        />
        <div className="flex justify-between text-xs text-[#475569] mt-1">
          <span>30m</span><span>45m</span><span>60m</span><span>75m</span><span>90m</span><span>105m</span><span>120m</span>
        </div>
      </Field>

      {/* Topics */}
      <Field label="Topics Covered" required>
        {!studentId ? (
          <div className="input-base text-[#475569] cursor-not-allowed">
            Select a student first to see their topics
          </div>
        ) : (
          <div className="relative">
            {/* Selected chips */}
            {selectedTopics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTopicNames.map((name, i) => (
                  <span
                    key={selectedTopics[i]}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F97316]/10 border border-[#F97316]/30 text-[#F97316] text-xs"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => toggleTopic(selectedTopics[i])}
                      className="hover:text-white ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <input
              type="text"
              placeholder={`Search ${selectedStudent?.qualification} ${selectedStudent?.exam_board} topics...`}
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              onFocus={() => setTopicsOpen(true)}
              className="input-base"
            />

            {/* Dropdown */}
            {topicsOpen && (
              <div className="absolute z-20 w-full mt-1 bg-[#1E293B] border border-[#334155] rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {Object.keys(groupedTopics).length === 0 ? (
                  <div className="px-4 py-3 text-[#475569] text-sm">No topics found</div>
                ) : (
                  Object.entries(groupedTopics).map(([category, catTopics]) => (
                    <div key={category}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider bg-[#0F172A] sticky top-0">
                        {category}
                      </div>
                      {catTopics.map((topic) => {
                        const checked = selectedTopics.includes(topic.id);
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => toggleTopic(topic.id)}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                              checked
                                ? "bg-[#F97316]/10 text-[#F97316]"
                                : "text-[#F8FAFC] hover:bg-[#334155]"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                              checked ? "bg-[#F97316] border-[#F97316] text-white" : "border-[#475569]"
                            }`}>
                              {checked && "✓"}
                            </span>
                            {topic.name}
                            {topic.tier && (
                              <span className="ml-auto text-xs text-[#475569]">{topic.tier}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
                <div className="sticky bottom-0 border-t border-[#334155] bg-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => setTopicsOpen(false)}
                    className="w-full py-2 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                  >
                    Done ({selectedTopics.length} selected)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Field>

      {/* Engagement */}
      <Field label="Student Engagement" required>
        <div className="grid grid-cols-4 gap-2">
          {ENGAGEMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEngagement(opt.value)}
              className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                engagement === opt.value
                  ? opt.color + " ring-1 ring-current"
                  : "border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:text-[#F8FAFC]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Comprehension */}
      <Field label="Comprehension" required>
        <div className="grid grid-cols-4 gap-2">
          {COMPREHENSION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setComprehension(opt.value)}
              className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                comprehension === opt.value
                  ? opt.color + " ring-1 ring-current"
                  : "border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:text-[#F8FAFC]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Session Notes */}
      <Field label="Session Notes">
        <textarea
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          rows={3}
          placeholder="What went well? What needs revisiting?"
          className="input-base resize-none"
        />
      </Field>

      {/* Homework */}
      <Field label="Homework Set">
        <textarea
          value={homeworkSet}
          onChange={(e) => setHomeworkSet(e.target.value)}
          rows={2}
          placeholder="What did you assign?"
          className="input-base resize-none"
        />
      </Field>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 px-4 rounded-xl bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {submitting ? "Logging session..." : "Log Session"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">
        {label}
        {required && <span className="text-[#F97316] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
