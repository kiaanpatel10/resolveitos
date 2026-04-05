"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Tutor = { id: string; full_name: string };

const EXAM_BOARDS = ["Edexcel", "AQA", "OCR"] as const;
const QUALIFICATIONS = ["GCSE", "A-Level"] as const;
const TIERS = ["Foundation", "Higher"] as const;
const YEAR_GROUPS = [7, 8, 9, 10, 11, 12, 13] as const;

const EMPTY_FORM = {
  full_name: "",
  year_group: "11",
  exam_board: "Edexcel",
  qualification: "GCSE",
  tier: "Higher",
  current_grade: "",
  target_grade: "",
  assigned_tutor_id: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  notes: "",
};

export default function AddStudentModal({
  tutors,
  onClose,
}: {
  tutors: Tutor[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isGCSE = form.qualification === "GCSE";

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Name is required");
    if (!form.target_grade.trim()) return toast.error("Target grade is required");

    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          year_group: Number(form.year_group),
          exam_board: form.exam_board,
          qualification: form.qualification,
          tier: isGCSE ? form.tier : "N/A",
          current_grade: form.current_grade.trim() || null,
          target_grade: form.target_grade.trim(),
          assigned_tutor_id: form.assigned_tutor_id || null,
          parent_name: form.parent_name.trim() || null,
          parent_email: form.parent_email.trim() || null,
          parent_phone: form.parent_phone.trim() || null,
          notes: form.notes.trim() || null,
          status: "active",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create student");
        return;
      }

      toast.success(`${form.full_name} added successfully`);
      onClose();
      router.refresh();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
            <h2 className="text-[#F8FAFC] font-semibold">Add New Student</h2>
            <button
              onClick={onClose}
              className="text-[#475569] hover:text-[#F8FAFC] transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Name */}
            <Field label="Full Name" required>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="e.g. James Smith"
                className="input-base"
                required
                autoFocus
              />
            </Field>

            {/* Year + Qualification */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year Group" required>
                <select
                  value={form.year_group}
                  onChange={(e) => set("year_group", e.target.value)}
                  className="input-base"
                >
                  {YEAR_GROUPS.map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </Field>
              <Field label="Qualification" required>
                <select
                  value={form.qualification}
                  onChange={(e) => {
                    set("qualification", e.target.value);
                    // Reset tier when switching to A-Level
                    if (e.target.value === "A-Level") set("tier", "N/A");
                    else set("tier", "Higher");
                  }}
                  className="input-base"
                >
                  {QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Exam Board + Tier (GCSE only) */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Exam Board" required>
                <select
                  value={form.exam_board}
                  onChange={(e) => set("exam_board", e.target.value)}
                  className="input-base"
                >
                  {EXAM_BOARDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </Field>
              {isGCSE && (
                <Field label="Tier" required>
                  <select
                    value={form.tier}
                    onChange={(e) => set("tier", e.target.value)}
                    className="input-base"
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            {/* Grades */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Current Grade">
                <input
                  type="text"
                  value={form.current_grade}
                  onChange={(e) => set("current_grade", e.target.value)}
                  placeholder="e.g. 5"
                  className="input-base"
                />
              </Field>
              <Field label="Target Grade" required>
                <input
                  type="text"
                  value={form.target_grade}
                  onChange={(e) => set("target_grade", e.target.value)}
                  placeholder="e.g. 7"
                  className="input-base"
                  required
                />
              </Field>
            </div>

            {/* Assigned tutor */}
            {tutors.length > 0 && (
              <Field label="Assigned Tutor">
                <select
                  value={form.assigned_tutor_id}
                  onChange={(e) => set("assigned_tutor_id", e.target.value)}
                  className="input-base"
                >
                  <option value="">Unassigned</option>
                  {tutors.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </Field>
            )}

            {/* Divider */}
            <div className="border-t border-[#334155] pt-1">
              <p className="text-[#475569] text-xs mb-3">Parent / Guardian (optional)</p>
              <div className="space-y-3">
                <Field label="Parent Name">
                  <input
                    type="text"
                    value={form.parent_name}
                    onChange={(e) => set("parent_name", e.target.value)}
                    placeholder="Full name"
                    className="input-base"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email">
                    <input
                      type="email"
                      value={form.parent_email}
                      onChange={(e) => set("parent_email", e.target.value)}
                      placeholder="email@example.com"
                      className="input-base"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={form.parent_phone}
                      onChange={(e) => set("parent_phone", e.target.value)}
                      placeholder="+44..."
                      className="input-base"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Notes */}
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                placeholder="Learning style, personality, anything useful..."
                className="input-base resize-none"
              />
            </Field>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                {saving ? "Adding..." : "Add Student"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
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
      <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
        {label}
        {required && <span className="text-[#F97316] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
