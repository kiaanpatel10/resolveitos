"use client";

import { useState } from "react";
import { toast } from "sonner";

type ScheduleEntry = {
  id: string;
  tutor_id: string;
  student_id: string;
  day_of_week: string;
  start_time: string;
  duration_minutes: number;
  recurring: boolean;
  status: string;
  notes: string | null;
  tutor: { id: string; full_name: string } | null;
  student: { id: string; full_name: string } | null;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

// 8:00 to 19:30 — 24 slots of 30 min each
const TIME_SLOTS: string[] = [];
for (let h = 8; h < 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 19 || true) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}
// keep only up to 19:30
const SLOTS = TIME_SLOTS.filter((t) => t <= "19:30");

const ROW_HEIGHT = 52; // px per 30-min slot

const TUTOR_COLOURS = [
  "bg-[#F97316]/20 border-[#F97316]/50 text-[#F97316]",
  "bg-blue-500/20 border-blue-500/50 text-blue-400",
  "bg-purple-500/20 border-purple-500/50 text-purple-400",
  "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  "bg-amber-500/20 border-amber-500/50 text-amber-400",
  "bg-rose-500/20 border-rose-500/50 text-rose-400",
  "bg-cyan-500/20 border-cyan-500/50 text-cyan-400",
  "bg-pink-500/20 border-pink-500/50 text-pink-400",
];

const DAY_SHORT: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 105, 120];

function slotIndex(timeStr: string): number {
  // timeStr like "09:00:00" or "09:00"
  const [h, m] = timeStr.split(":").map(Number);
  return (h - 8) * 2 + (m >= 30 ? 1 : 0);
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")}${ampm}`;
}

function generateICS(entries: ScheduleEntry[]): void {
  const DAY_TO_BYDAY: Record<string, string> = {
    Monday: "MO", Tuesday: "TU", Wednesday: "WE", Thursday: "TH",
    Friday: "FR", Saturday: "SA", Sunday: "SU",
  };

  function getNextDateForDay(dayOfWeek: string): Date {
    const dayIndex: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    const today = new Date();
    const todayDay = today.getDay();
    const target = dayIndex[dayOfWeek] ?? 1;
    const diff = ((target - todayDay + 7) % 7) || 7;
    const d = new Date(today);
    d.setDate(today.getDate() + diff);
    return d;
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ResolveIt OS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const entry of entries) {
    const date = getNextDateForDay(entry.day_of_week);
    const [sh, sm] = entry.start_time.split(":").map(Number);
    const startMs = new Date(date.getFullYear(), date.getMonth(), date.getDate(), sh, sm, 0);
    const endMs = new Date(startMs.getTime() + entry.duration_minutes * 60000);

    function fmtDT(d: Date): string {
      return (
        String(d.getFullYear()) +
        String(d.getMonth() + 1).padStart(2, "0") +
        String(d.getDate()).padStart(2, "0") +
        "T" +
        String(d.getHours()).padStart(2, "0") +
        String(d.getMinutes()).padStart(2, "0") +
        "00"
      );
    }

    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART:${fmtDT(startMs)}`);
    lines.push(`DTEND:${fmtDT(endMs)}`);
    lines.push(`SUMMARY:${entry.student?.full_name ?? "Student"} — Tutoring Session`);
    if (entry.tutor) lines.push(`DESCRIPTION:Tutor: ${entry.tutor.full_name}`);
    if (entry.recurring) lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${DAY_TO_BYDAY[entry.day_of_week] ?? "MO"}`);
    lines.push(`UID:resolveit-${entry.id}@resolveit-os`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resolveit-schedule.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ScheduleView({
  schedule: initialSchedule,
  tutors,
  students,
  isAdmin,
  currentUserId,
}: {
  schedule: ScheduleEntry[];
  tutors: { id: string; full_name: string }[];
  students: { id: string; full_name: string; assigned_tutor_id: string | null }[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
  const [mobileDay, setMobileDay] = useState<string>(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

  // Build tutor colour map
  const tutorColourMap: Record<string, string> = {};
  const uniqueTutorIds = [...new Set(schedule.map((e) => e.tutor_id))];
  uniqueTutorIds.forEach((tid, i) => {
    tutorColourMap[tid] = TUTOR_COLOURS[i % TUTOR_COLOURS.length];
  });

  const totalH = SLOTS.length * ROW_HEIGHT;

  async function handleCancel(id: string) {
    const res = await fetch(`/api/schedule/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (res.ok) {
      setSchedule((prev) => prev.filter((e) => e.id !== id));
      setSelectedEntry(null);
      toast.success("Session cancelled");
    } else {
      toast.error("Failed to cancel");
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[#F8FAFC] text-xl font-semibold">Schedule</h1>
            <p className="text-[#94A3B8] text-sm mt-0.5">
              {schedule.length} session{schedule.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>
          <div className="flex gap-2">
            {schedule.length > 0 && (
              <button
                onClick={() => generateICS(schedule)}
                className="px-3 py-2 rounded-lg border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors"
              >
                Export .ics
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium transition-colors"
            >
              + Add Session
            </button>
          </div>
        </div>

        {/* Desktop: Weekly grid */}
        <div className="hidden md:block bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#334155]">
                <div className="px-2 py-2" />
                {DAYS.map((day) => (
                  <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-[#94A3B8] uppercase tracking-wider border-l border-[#334155]">
                    {DAY_SHORT[day]}
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="relative" style={{ height: totalH }}>
                {/* Time labels + horizontal lines */}
                {SLOTS.map((slot, i) => (
                  <div
                    key={slot}
                    className="absolute left-0 right-0 flex items-start"
                    style={{ top: i * ROW_HEIGHT }}
                  >
                    <div className="w-[60px] px-2 text-[10px] text-[#475569] flex-shrink-0 leading-none pt-1">
                      {i % 2 === 0 ? formatTime(slot) : ""}
                    </div>
                    <div className="flex-1 border-t border-[#1E293B]/0" style={{ borderTopColor: i % 2 === 0 ? "#334155" : "#1E293B" }} />
                  </div>
                ))}

                {/* Day column dividers */}
                <div className="absolute inset-0 grid grid-cols-[60px_repeat(7,1fr)] pointer-events-none">
                  <div />
                  {DAYS.map((day) => (
                    <div key={day} className="border-l border-[#334155]" />
                  ))}
                </div>

                {/* Session blocks */}
                {DAYS.map((day, dayIdx) => {
                  const dayEntries = schedule.filter((e) => e.day_of_week === day);
                  return dayEntries.map((entry) => {
                    const startSlot = slotIndex(entry.start_time);
                    const spanSlots = Math.max(1, entry.duration_minutes / 30);
                    const top = startSlot * ROW_HEIGHT;
                    const height = spanSlots * ROW_HEIGHT - 4;
                    const colour = tutorColourMap[entry.tutor_id] ?? TUTOR_COLOURS[0];
                    const colWidth = `calc((100% - 60px) / 7)`;
                    const colLeft = `calc(60px + ${dayIdx} * (100% - 60px) / 7 + 2px)`;

                    return (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={`absolute rounded-lg border px-2 py-1 text-left overflow-hidden transition-opacity hover:opacity-80 ${colour}`}
                        style={{ top, height, left: colLeft, width: `calc(${colWidth} - 4px)` }}
                      >
                        <p className="text-xs font-semibold leading-tight truncate">
                          {entry.student?.full_name ?? "Student"}
                        </p>
                        {isAdmin && entry.tutor && (
                          <p className="text-[10px] opacity-70 truncate">{entry.tutor.full_name}</p>
                        )}
                        <p className="text-[10px] opacity-60 mt-0.5">
                          {formatTime(entry.start_time)} · {entry.duration_minutes}m
                        </p>
                      </button>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: day selector + list */}
        <div className="md:hidden space-y-3">
          {/* Day pills */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {DAYS.map((day) => {
              const count = schedule.filter((e) => e.day_of_week === day).length;
              return (
                <button
                  key={day}
                  onClick={() => setMobileDay(day)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    mobileDay === day
                      ? "bg-[#334155] text-[#F8FAFC] font-medium"
                      : "text-[#94A3B8] hover:text-[#F8FAFC]"
                  }`}
                >
                  {DAY_SHORT[day]}
                  {count > 0 && (
                    <span className="ml-1.5 text-xs opacity-60">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sessions for selected day */}
          {schedule.filter((e) => e.day_of_week === mobileDay).length === 0 ? (
            <div className="text-center py-12 text-[#475569] text-sm">No sessions on {mobileDay}</div>
          ) : (
            <div className="space-y-2">
              {schedule
                .filter((e) => e.day_of_week === mobileDay)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((entry) => {
                  const colour = tutorColourMap[entry.tutor_id] ?? TUTOR_COLOURS[0];
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className={`w-full text-left p-4 rounded-xl border ${colour}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{entry.student?.full_name ?? "Student"}</p>
                          {isAdmin && entry.tutor && (
                            <p className="text-xs opacity-70">{entry.tutor.full_name}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium">{formatTime(entry.start_time)}</p>
                          <p className="text-xs opacity-60">{entry.duration_minutes}m</p>
                        </div>
                      </div>
                      {entry.recurring && (
                        <p className="text-xs opacity-50 mt-1">Recurring weekly</p>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {schedule.length === 0 && (
          <div className="hidden md:flex flex-col items-center py-16 text-[#475569]">
            <p className="text-sm">No sessions scheduled yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium transition-colors"
            >
              Add your first session
            </button>
          </div>
        )}
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <AddSessionModal
          tutors={tutors}
          students={students}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onClose={() => setShowAddModal(false)}
          onSuccess={(entry) => {
            setSchedule((prev) => [...prev, entry]);
            setShowAddModal(false);
            toast.success("Session added");
          }}
        />
      )}

      {/* Edit/Cancel Modal */}
      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          isAdmin={isAdmin}
          onClose={() => setSelectedEntry(null)}
          onCancel={() => handleCancel(selectedEntry.id)}
          onUpdate={(updated) => {
            setSchedule((prev) => prev.map((e) => e.id === updated.id ? updated : e));
            setSelectedEntry(null);
            toast.success("Session updated");
          }}
        />
      )}
    </>
  );
}

// ─── Add Session Modal ────────────────────────────────────────────────────────

function AddSessionModal({
  tutors,
  students,
  isAdmin,
  currentUserId,
  onClose,
  onSuccess,
}: {
  tutors: { id: string; full_name: string }[];
  students: { id: string; full_name: string; assigned_tutor_id: string | null }[];
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onSuccess: (entry: ScheduleEntry) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tutor_id: isAdmin ? "" : currentUserId,
    student_id: "",
    day_of_week: "Monday",
    start_time: "09:00",
    duration_minutes: 60,
    recurring: true,
    notes: "",
  });

  // Filter students by selected tutor
  const visibleStudents = isAdmin && form.tutor_id
    ? students.filter((s) => s.assigned_tutor_id === form.tutor_id)
    : students;

  function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
          {label}{required && <span className="text-[#F97316] ml-0.5">*</span>}
        </label>
        {children}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.student_id || !form.day_of_week || !form.start_time) return;
    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutor_id: form.tutor_id || currentUserId,
          student_id: form.student_id,
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          duration_minutes: form.duration_minutes,
          recurring: form.recurring,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add"); return; }
      onSuccess(data.entry);
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#334155] sticky top-0 bg-[#1E293B]">
            <h2 className="text-[#F8FAFC] font-semibold">Add Scheduled Session</h2>
            <button onClick={onClose} className="text-[#475569] hover:text-[#94A3B8] text-lg leading-none">×</button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {isAdmin && (
              <Field label="Tutor" required>
                <select
                  value={form.tutor_id}
                  onChange={(e) => setForm((f) => ({ ...f, tutor_id: e.target.value, student_id: "" }))}
                  className="input-base"
                  required
                >
                  <option value="">Select tutor...</option>
                  {tutors.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </Field>
            )}

            <Field label="Student" required>
              <select
                value={form.student_id}
                onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
                className="input-base"
                required
              >
                <option value="">Select student...</option>
                {visibleStudents.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Day" required>
                <select
                  value={form.day_of_week}
                  onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}
                  className="input-base"
                >
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Start Time" required>
                <select
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="input-base"
                >
                  {SLOTS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Duration">
                <select
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                  className="input-base"
                >
                  {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </Field>
              <Field label="Recurring">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, recurring: !f.recurring }))}
                  className={`w-full py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.recurring
                      ? "bg-[#F97316]/10 border-[#F97316]/40 text-[#F97316]"
                      : "border-[#334155] text-[#94A3B8]"
                  }`}
                >
                  {form.recurring ? "Weekly" : "One-off"}
                </button>
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Any notes..."
                className="input-base resize-none"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {saving ? "Adding..." : "Add Session"}
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Entry Detail / Edit Modal ────────────────────────────────────────────────

function EntryDetailModal({
  entry,
  isAdmin,
  onClose,
  onCancel,
  onUpdate,
}: {
  entry: ScheduleEntry;
  isAdmin: boolean;
  onClose: () => void;
  onCancel: () => void;
  onUpdate: (updated: ScheduleEntry) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    day_of_week: entry.day_of_week,
    start_time: entry.start_time.slice(0, 5), // "HH:MM"
    duration_minutes: entry.duration_minutes,
    recurring: entry.recurring,
    notes: entry.notes ?? "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/schedule/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          duration_minutes: form.duration_minutes,
          recurring: form.recurring,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to update"); return; }
      onUpdate(data.entry);
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#334155]">
            <h2 className="text-[#F8FAFC] font-semibold">Session Details</h2>
            <button onClick={onClose} className="text-[#475569] hover:text-[#94A3B8] text-lg leading-none">×</button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-[#475569] text-xs">Student</p>
              <p className="text-[#F8FAFC] font-semibold">{entry.student?.full_name ?? "—"}</p>
            </div>
            {isAdmin && (
              <div>
                <p className="text-[#475569] text-xs">Tutor</p>
                <p className="text-[#F8FAFC]">{entry.tutor?.full_name ?? "—"}</p>
              </div>
            )}

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[#475569] text-xs mb-1">Day</p>
                    <select value={form.day_of_week} onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))} className="input-base text-sm py-1.5">
                      {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[#475569] text-xs mb-1">Start Time</p>
                    <select value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} className="input-base text-sm py-1.5">
                      {SLOTS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="text-[#475569] text-xs mb-1">Duration</p>
                  <select value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))} className="input-base text-sm py-1.5">
                    {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[#475569] text-xs mb-1">Notes</p>
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="input-base text-sm resize-none" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white text-sm font-medium transition-colors">
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg border border-[#334155] text-[#94A3B8] text-sm transition-colors">
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[#475569] text-xs">Day</p>
                    <p className="text-[#F8FAFC]">{entry.day_of_week}</p>
                  </div>
                  <div>
                    <p className="text-[#475569] text-xs">Time</p>
                    <p className="text-[#F8FAFC]">{formatTime(entry.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-[#475569] text-xs">Duration</p>
                    <p className="text-[#F8FAFC]">{entry.duration_minutes} min</p>
                  </div>
                  <div>
                    <p className="text-[#475569] text-xs">Recurring</p>
                    <p className="text-[#F8FAFC]">{entry.recurring ? "Weekly" : "One-off"}</p>
                  </div>
                </div>
                {entry.notes && (
                  <div>
                    <p className="text-[#475569] text-xs">Notes</p>
                    <p className="text-[#94A3B8] text-sm">{entry.notes}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditing(true)}
                    className="flex-1 py-2 rounded-lg border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors">
                    Edit
                  </button>
                  <button onClick={onCancel}
                    className="flex-1 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors">
                    Cancel Session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
