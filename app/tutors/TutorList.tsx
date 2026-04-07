"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type TutorRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  studentCount: number;
  sessionsThisWeek: number;
  lastActive: string | null;
};

export default function TutorList({ tutors }: { tutors: TutorRow[] }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-[#475569] text-sm">{tutors.length} tutor{tutors.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium transition-colors"
        >
          + Add Tutor
        </button>
      </div>

      {/* Table */}
      {tutors.length === 0 ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-16 text-center">
          <span className="text-3xl">👥</span>
          <p className="text-[#475569] text-sm mt-3">No tutors yet. Add one to get started.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#334155]">
                  {["Tutor", "Students", "Sessions This Week", "Last Active", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {tutors.map((t) => (
                  <tr key={t.id} className="hover:bg-[#334155]/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[#F8FAFC] font-medium">{t.full_name}</p>
                      <p className="text-[#475569] text-xs">{t.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${t.studentCount > 0 ? "text-[#3B82F6]" : "text-[#475569]"}`}>
                        {t.studentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${t.sessionsThisWeek > 0 ? "text-[#F97316]" : "text-[#475569]"}`}>
                        {t.sessionsThisWeek}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8] text-sm">
                      {t.lastActive
                        ? new Date(t.lastActive).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : <span className="text-[#475569]">Never</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/tutors/${t.id}`}
                        className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tutors.map((t) => (
              <Link
                key={t.id}
                href={`/tutors/${t.id}`}
                className="block bg-[#1E293B] border border-[#334155] rounded-xl p-4 hover:border-[#475569] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[#F8FAFC] font-medium">{t.full_name}</p>
                    <p className="text-[#475569] text-xs mt-0.5">{t.email}</p>
                  </div>
                  <span className="text-[#475569] text-xs">→</span>
                </div>
                <div className="flex gap-4 mt-3 text-xs">
                  <div>
                    <p className="text-[#475569]">Students</p>
                    <p className={`font-semibold ${t.studentCount > 0 ? "text-[#3B82F6]" : "text-[#475569]"}`}>
                      {t.studentCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#475569]">This week</p>
                    <p className={`font-semibold ${t.sessionsThisWeek > 0 ? "text-[#F97316]" : "text-[#475569]"}`}>
                      {t.sessionsThisWeek}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#475569]">Last active</p>
                    <p className="text-[#94A3B8]">
                      {t.lastActive
                        ? new Date(t.lastActive).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "Never"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {showModal && <AddTutorModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function AddTutorModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tutors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create tutor");
        return;
      }
      toast.success(`${form.full_name} added as a tutor`);
      onClose();
      router.refresh();
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
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-md shadow-2xl">
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#334155]">
            <h2 className="text-[#F8FAFC] font-semibold">Add Tutor</h2>
            <button
              onClick={onClose}
              className="text-[#475569] hover:text-[#94A3B8] transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Field label="Full Name" required>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. Sarah Johnson"
                className="input-base"
                required
              />
            </Field>

            <Field label="Email Address" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="sarah@example.com"
                className="input-base"
                required
              />
            </Field>

            <Field label="Temporary Password" required>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                className="input-base"
                minLength={8}
                required
              />
            </Field>

            <p className="text-[#475569] text-xs">
              The tutor can change their password after first login.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {saving ? "Creating..." : "Create Tutor Account"}
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
