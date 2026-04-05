"use client";

import { useState } from "react";
import { toast } from "sonner";

type Student = {
  id: string;
  full_name: string;
  year_group: number;
  exam_board: string;
  qualification: string;
  tier: string | null;
  current_grade: string | null;
  target_grade: string;
  start_date: string;
  status: string;
  assigned_tutor_id: string | null;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  notes: string | null;
  tutor: { id: string; full_name: string } | null;
};

type TopicRow = {
  id: string;
  name: string;
  category: string;
  qualification: string;
  exam_board: string;
  tier: string | null;
  difficulty: number | null;
  order_index: number | null;
};

type ProgressRow = {
  topic_id: string;
  status: string;
  times_covered: number;
  latest_comprehension: string | null;
  last_covered_date: string | null;
};

type SessionRow = {
  id: string;
  session_date: string;
  session_type: string;
  duration_minutes: number;
  topics_covered: string[];
  student_engagement: string | null;
  comprehension: string | null;
  session_notes: string | null;
  homework_set: string | null;
  tutor: { full_name: string } | null;
};

type TopicMapRow = { id: string; name: string; category: string };

const STATUS_CHIP: Record<string, string> = {
  not_started: "bg-[#475569]/20 text-[#475569] border-[#475569]/30",
  in_progress: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30",
  covered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  mastered: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

const ENGAGEMENT_LABEL: Record<string, { label: string; colour: string }> = {
  excellent: { label: "Excellent", colour: "text-emerald-400" },
  good: { label: "Good", colour: "text-blue-400" },
  average: { label: "Average", colour: "text-amber-400" },
  poor: { label: "Poor", colour: "text-red-400" },
};

const COMPREHENSION_LABEL: Record<string, { label: string; colour: string }> = {
  mastered: { label: "Mastered", colour: "text-amber-400" },
  confident: { label: "Confident", colour: "text-emerald-400" },
  developing: { label: "Developing", colour: "text-blue-400" },
  struggling: { label: "Struggling", colour: "text-red-400" },
};

const STATUS_COLOUR: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  churned: "bg-red-500/10 text-red-400 border-red-500/20",
};

type Tab = "progress" | "sessions" | "details";

export default function StudentProfile({
  student,
  topics,
  progress,
  sessions,
  allTopics,
  tutors,
  isAdmin,
}: {
  student: Student;
  topics: TopicRow[];
  progress: ProgressRow[];
  sessions: SessionRow[];
  allTopics: TopicMapRow[];
  tutors: { id: string; full_name: string }[];
  isAdmin: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("progress");

  // Build progress lookup: topic_id → progress row
  const progressMap = Object.fromEntries(progress.map((p) => [p.topic_id, p]));
  const topicNameMap = Object.fromEntries(allTopics.map((t) => [t.id, t.name]));

  // Progress stats
  const covered = progress.filter((p) => p.status === "covered" || p.status === "mastered").length;
  const mastered = progress.filter((p) => p.status === "mastered").length;
  const totalTopics = topics.length;
  const pct = totalTopics > 0 ? Math.round((covered / totalTopics) * 100) : 0;

  // Group topics by category
  const topicsByCategory = topics.reduce<Record<string, TopicRow[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Student header card */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[#F8FAFC] text-2xl font-bold">{student.full_name}</h1>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                  STATUS_COLOUR[student.status] ?? ""
                }`}
              >
                {student.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#94A3B8]">
              <span>Year {student.year_group}</span>
              <span>{student.qualification} · {student.exam_board}{student.tier && student.tier !== "N/A" ? ` · ${student.tier}` : ""}</span>
              {student.tutor && <span>Tutor: {student.tutor.full_name}</span>}
            </div>
          </div>
          {/* Grade targets */}
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-[#475569] text-xs mb-0.5">Current</p>
              <p className="text-[#F8FAFC] text-xl font-bold">{student.current_grade ?? "—"}</p>
            </div>
            <div className="text-[#334155] self-center text-lg">→</div>
            <div className="text-center">
              <p className="text-[#475569] text-xs mb-0.5">Target</p>
              <p className="text-[#F97316] text-xl font-bold">{student.target_grade}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5 text-xs text-[#94A3B8]">
            <span>{covered}/{totalTopics} topics covered</span>
            <span>{mastered} mastered · <span className="text-[#F97316] font-semibold">{pct}%</span></span>
          </div>
          <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F97316] rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1E293B] border border-[#334155] rounded-xl p-1">
        {(["progress", "sessions", "details"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-[#334155] text-[#F8FAFC]"
                : "text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            {tab === "sessions" ? "Sessions" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "sessions" && sessions.length > 0 && (
              <span className="ml-1.5 text-xs text-[#475569]">({sessions.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "progress" && (
        <ProgressTab
          topicsByCategory={topicsByCategory}
          progressMap={progressMap}
          totalTopics={totalTopics}
          covered={covered}
          mastered={mastered}
        />
      )}
      {activeTab === "sessions" && (
        <SessionsTab sessions={sessions} topicNameMap={topicNameMap} />
      )}
      {activeTab === "details" && (
        <DetailsTab
          student={student}
          tutors={tutors}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

// ─── Progress Tab ────────────────────────────────────────────────────────────

function ProgressTab({
  topicsByCategory,
  progressMap,
  totalTopics,
  covered,
  mastered,
}: {
  topicsByCategory: Record<string, TopicRow[]>;
  progressMap: Record<string, ProgressRow>;
  totalTopics: number;
  covered: number;
  mastered: number;
}) {
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: "Not started", cls: "bg-[#475569]/20 text-[#475569] border-[#475569]/30" },
          { label: "Covered", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
          { label: "Mastered", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
        ].map((l) => (
          <span key={l.label} className={`px-2.5 py-1 rounded-md border ${l.cls}`}>
            {l.label}
          </span>
        ))}
        <span className="text-[#475569] self-center ml-1">
          {covered}/{totalTopics} covered · {mastered} mastered
        </span>
      </div>

      {/* Topics by category */}
      {Object.entries(topicsByCategory).map(([category, catTopics]) => {
        const catCovered = catTopics.filter(
          (t) => progressMap[t.id]?.status === "covered" || progressMap[t.id]?.status === "mastered"
        ).length;

        return (
          <div key={category} className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#F8FAFC] font-semibold text-sm">{category}</h3>
              <span className="text-xs text-[#475569]">
                {catCovered}/{catTopics.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {catTopics.map((topic) => {
                const prog = progressMap[topic.id];
                const status = prog?.status ?? "not_started";
                return (
                  <div
                    key={topic.id}
                    title={
                      prog
                        ? `${status.replace("_", " ")} · covered ${prog.times_covered}x · ${prog.latest_comprehension ?? ""}`
                        : "Not started"
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-default ${
                      STATUS_CHIP[status] ?? STATUS_CHIP["not_started"]
                    }`}
                  >
                    {topic.name}
                    {topic.tier === "Higher" && (
                      <span className="ml-1 opacity-50 text-[10px]">H</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {Object.keys(topicsByCategory).length === 0 && (
        <div className="text-center py-12 text-[#475569]">
          No topics found for this student&apos;s curriculum
        </div>
      )}
    </div>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab({
  sessions,
  topicNameMap,
}: {
  sessions: SessionRow[];
  topicNameMap: Record<string, string>;
}) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-[#475569]">
        No sessions logged yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 space-y-3"
        >
          {/* Session header */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#F8FAFC] font-medium text-sm">
                  {new Date(s.session_date).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#334155] text-[#94A3B8] capitalize">
                  {s.session_type.replace("_", " ")}
                </span>
                <span className="text-xs text-[#475569]">{s.duration_minutes}m</span>
              </div>
              {s.tutor && (
                <p className="text-[#475569] text-xs mt-0.5">with {s.tutor.full_name}</p>
              )}
            </div>
            {/* Engagement + Comprehension */}
            <div className="flex gap-3 text-xs">
              {s.student_engagement && ENGAGEMENT_LABEL[s.student_engagement] && (
                <span className={ENGAGEMENT_LABEL[s.student_engagement].colour}>
                  {ENGAGEMENT_LABEL[s.student_engagement].label}
                </span>
              )}
              {s.comprehension && COMPREHENSION_LABEL[s.comprehension] && (
                <span className={COMPREHENSION_LABEL[s.comprehension].colour}>
                  {COMPREHENSION_LABEL[s.comprehension].label}
                </span>
              )}
            </div>
          </div>

          {/* Topics covered */}
          {s.topics_covered.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {s.topics_covered.map((tid) => (
                <span
                  key={tid}
                  className="px-2 py-0.5 rounded-md bg-[#334155] text-[#94A3B8] text-xs"
                >
                  {topicNameMap[tid] ?? tid}
                </span>
              ))}
            </div>
          )}

          {/* Notes */}
          {s.session_notes && (
            <p className="text-[#94A3B8] text-sm border-t border-[#334155] pt-2">
              {s.session_notes}
            </p>
          )}

          {/* Homework */}
          {s.homework_set && (
            <div className="flex gap-2 text-sm">
              <span className="text-[#475569] flex-shrink-0">HW:</span>
              <span className="text-[#94A3B8]">{s.homework_set}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Details Tab ──────────────────────────────────────────────────────────────

function DetailsTab({
  student,
  tutors,
  isAdmin,
}: {
  student: Student;
  tutors: { id: string; full_name: string }[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    current_grade: student.current_grade ?? "",
    target_grade: student.target_grade,
    status: student.status,
    assigned_tutor_id: student.assigned_tutor_id ?? "",
    parent_name: student.parent_name ?? "",
    parent_email: student.parent_email ?? "",
    parent_phone: student.parent_phone ?? "",
    notes: student.notes ?? "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_grade: form.current_grade || null,
          target_grade: form.target_grade,
          status: form.status,
          assigned_tutor_id: form.assigned_tutor_id || null,
          parent_name: form.parent_name || null,
          parent_email: form.parent_email || null,
          parent_phone: form.parent_phone || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Failed to save");
        return;
      }
      toast.success("Student updated");
      setEditing(false);
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Student info */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#F8FAFC] font-semibold text-sm">Student Details</h3>
          {isAdmin && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <DetailRow label="Full Name" value={student.full_name} />
          <DetailRow label="Year Group" value={`Year ${student.year_group}`} />
          <DetailRow label="Qualification" value={student.qualification} />
          <DetailRow label="Exam Board" value={student.exam_board} />
          {student.tier && student.tier !== "N/A" && (
            <DetailRow label="Tier" value={student.tier} />
          )}
          <DetailRow
            label="Start Date"
            value={new Date(student.start_date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />

          {editing ? (
            <>
              <EditRow
                label="Current Grade"
                value={form.current_grade}
                onChange={(v) => setForm((f) => ({ ...f, current_grade: v }))}
                placeholder="e.g. 5"
              />
              <EditRow
                label="Target Grade"
                value={form.target_grade}
                onChange={(v) => setForm((f) => ({ ...f, target_grade: v }))}
                placeholder="e.g. 7"
              />
              <div>
                <p className="text-[#475569] text-xs mb-1">Status</p>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="input-base text-xs py-1.5"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
              {isAdmin && tutors.length > 0 && (
                <div>
                  <p className="text-[#475569] text-xs mb-1">Assigned Tutor</p>
                  <select
                    value={form.assigned_tutor_id}
                    onChange={(e) => setForm((f) => ({ ...f, assigned_tutor_id: e.target.value }))}
                    className="input-base text-xs py-1.5"
                  >
                    <option value="">Unassigned</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              <DetailRow label="Current Grade" value={student.current_grade ?? "—"} />
              <DetailRow label="Target Grade" value={student.target_grade} highlight />
              <DetailRow label="Status" value={student.status} capitalize />
              <DetailRow label="Tutor" value={student.tutor?.full_name ?? "Unassigned"} />
            </>
          )}
        </div>

        {editing && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-[#334155]">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Parent contact */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <h3 className="text-[#F8FAFC] font-semibold text-sm mb-4">Parent / Guardian</h3>
        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            <EditRow
              label="Parent Name"
              value={form.parent_name}
              onChange={(v) => setForm((f) => ({ ...f, parent_name: v }))}
              placeholder="Full name"
            />
            <EditRow
              label="Email"
              value={form.parent_email}
              onChange={(v) => setForm((f) => ({ ...f, parent_email: v }))}
              placeholder="email@example.com"
            />
            <EditRow
              label="Phone"
              value={form.parent_phone}
              onChange={(v) => setForm((f) => ({ ...f, parent_phone: v }))}
              placeholder="+44..."
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailRow label="Name" value={student.parent_name ?? "—"} />
            <DetailRow label="Email" value={student.parent_email ?? "—"} />
            <DetailRow label="Phone" value={student.parent_phone ?? "—"} />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <h3 className="text-[#F8FAFC] font-semibold text-sm mb-3">Notes</h3>
        {editing ? (
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={4}
            placeholder="Personality, learning style, anything useful..."
            className="input-base resize-none text-sm"
          />
        ) : (
          <p className="text-[#94A3B8] text-sm whitespace-pre-wrap">
            {student.notes ?? <span className="text-[#475569]">No notes</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
  capitalize,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div>
      <p className="text-[#475569] text-xs mb-0.5">{label}</p>
      <p className={`${highlight ? "text-[#F97316] font-semibold" : "text-[#F8FAFC]"} ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function EditRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="text-[#475569] text-xs mb-1">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base text-sm py-1.5"
      />
    </div>
  );
}
