"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type InvoiceRow = {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  student: { id: string; full_name: string } | null;
};

const STATUS_COLOUR: Record<string, string> = {
  draft: "bg-[#334155] text-[#94A3B8] border-[#475569]",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function InvoiceList({
  invoices: initialInvoices,
  students,
}: {
  invoices: InvoiceRow[];
  students: { id: string; full_name: string }[];
}) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = invoices.filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false;
    return true;
  });

  const totalOutstanding = invoices
    .filter((i) => i.status === "overdue" || i.status === "sent")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  async function markPaid(id: string) {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid", paid_date: new Date().toISOString().split("T")[0] }),
    });
    if (res.ok) {
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: "paid", paid_date: new Date().toISOString().split("T")[0] } : i
        )
      );
      toast.success("Marked as paid");
    } else {
      toast.error("Failed to update");
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#F8FAFC] text-xl font-semibold">Invoices</h1>
            <p className="text-[#94A3B8] text-sm mt-0.5">{invoices.length} total</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium transition-colors"
          >
            + Create Invoice
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 text-center">
            <p className="text-[#475569] text-xs mb-1">Outstanding</p>
            <p className="text-red-400 font-bold text-xl">£{totalOutstanding.toFixed(2)}</p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 text-center">
            <p className="text-[#475569] text-xs mb-1">Collected</p>
            <p className="text-emerald-400 font-bold text-xl">£{totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 text-center">
            <p className="text-[#475569] text-xs mb-1">Total Invoiced</p>
            <p className="text-[#F8FAFC] font-bold text-xl">
              £{invoices.reduce((s, i) => s + i.amount, 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-base w-auto"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Invoice list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#475569]">No invoices found</div>
        ) : (
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#334155] text-[#475569] text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Student</th>
                    <th className="text-left px-4 py-3 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Due Date</th>
                    <th className="text-left px-4 py-3 font-medium">Notes</th>
                    <th className="text-left px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-[#334155] last:border-0 hover:bg-[#334155]/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {inv.student ? (
                          <Link
                            href={`/students/${inv.student.id}`}
                            className="text-[#F8FAFC] font-medium hover:text-[#F97316] transition-colors"
                          >
                            {inv.student.full_name}
                          </Link>
                        ) : (
                          <span className="text-[#475569]">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#F8FAFC] font-semibold">
                        £{inv.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded border text-xs capitalize ${STATUS_COLOUR[inv.status] ?? ""}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#94A3B8]">
                        {new Date(inv.due_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {inv.paid_date && (
                          <span className="block text-xs text-emerald-400">
                            Paid {new Date(inv.paid_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#475569] text-xs max-w-xs truncate">
                        {inv.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {(inv.status === "sent" || inv.status === "overdue") && (
                          <button
                            onClick={() => markPaid(inv.id)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            Mark paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#334155]">
              {filtered.map((inv) => (
                <div key={inv.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {inv.student ? (
                        <Link
                          href={`/students/${inv.student.id}`}
                          className="text-[#F8FAFC] font-medium hover:text-[#F97316]"
                        >
                          {inv.student.full_name}
                        </Link>
                      ) : (
                        <p className="text-[#475569]">Unknown</p>
                      )}
                      <p className="text-[#94A3B8] text-xs mt-0.5">
                        Due {new Date(inv.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#F8FAFC] font-semibold">£{inv.amount.toFixed(2)}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded border text-xs capitalize mt-1 ${STATUS_COLOUR[inv.status] ?? ""}`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                  {(inv.status === "sent" || inv.status === "overdue") && (
                    <button
                      onClick={() => markPaid(inv.id)}
                      className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Mark paid
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateInvoiceModal
          students={students}
          onClose={() => setShowCreate(false)}
          onSuccess={(inv) => {
            setInvoices((prev) => [inv, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}

function CreateInvoiceModal({
  students,
  onClose,
  onSuccess,
}: {
  students: { id: string; full_name: string }[];
  onClose: () => void;
  onSuccess: (inv: InvoiceRow) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    student_id: "",
    amount: "",
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "draft",
    notes: "",
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
    if (!form.student_id || !form.amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: form.student_id,
          amount: parseFloat(form.amount),
          due_date: form.due_date,
          status: form.status,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create invoice");
        return;
      }
      // Attach student name for local state
      const student = students.find((s) => s.id === form.student_id) ?? null;
      toast.success("Invoice created");
      onSuccess({ ...data.invoice, student });
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
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#334155]">
            <h2 className="text-[#F8FAFC] font-semibold">Create Invoice</h2>
            <button onClick={onClose} className="text-[#475569] hover:text-[#94A3B8] text-lg leading-none">×</button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Field label="Student" required>
              <select
                value={form.student_id}
                onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
                className="input-base"
                required
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount (£)" required>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 120"
                  className="input-base"
                  min={0}
                  step={0.01}
                  required
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="input-base"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                </select>
              </Field>
            </div>

            <Field label="Due Date" required>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="input-base"
                required
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="e.g. April sessions"
                className="input-base resize-none"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {saving ? "Creating..." : "Create Invoice"}
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
