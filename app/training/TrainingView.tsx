"use client";

import { useState } from "react";
import { toast } from "sonner";

type TrainingModule = {
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

type ProgressRow = {
  module_id: string;
  status: "not_started" | "in_progress" | "completed";
  completed_at: string | null;
};

const TYPE_COLOURS: Record<string, string> = {
  sop: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  video: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  document: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const TYPE_LABELS: Record<string, string> = {
  sop: "SOP",
  video: "Video",
  document: "Document",
};

const STATUS_COLOURS: Record<string, string> = {
  not_started: "bg-[#334155] text-[#94A3B8] border-[#475569]",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

// Minimal markdown renderer for SOP content
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-[#F8FAFC] font-semibold text-sm mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[#F8FAFC] font-bold text-base mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[#F8FAFC] font-bold text-lg mt-0 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#F8FAFC]">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-[#94A3B8]">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="text-[#94A3B8] text-sm ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-[#94A3B8] text-sm ml-4 list-decimal">$1</li>')
    .replace(/\|(.+)\|/g, (line) => {
      const cells = line.split("|").filter(Boolean).map((c) => c.trim());
      const isHeader = false;
      return `<tr>${cells.map((c) => `<td class="px-3 py-1.5 text-sm text-[#94A3B8] border border-[#334155] ${isHeader ? "font-semibold text-[#F8FAFC]" : ""}">${c}</td>`).join("")}</tr>`;
    })
    .replace(/^(?!<)(.+)$/gm, '<p class="text-[#94A3B8] text-sm mb-2">$1</p>')
    .replace(/\n\n/g, '<div class="mb-2"></div>');
}

export default function TrainingView({
  modules: initialModules,
  progress: initialProgress,
  isAdmin,
  tutorId,
}: {
  modules: TrainingModule[];
  progress: ProgressRow[];
  isAdmin: boolean;
  tutorId: string;
}) {
  const [modules, setModules] = useState(initialModules);
  const [progress, setProgress] = useState(initialProgress);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const progressMap = Object.fromEntries(progress.map((p) => [p.module_id, p]));

  const completed = progress.filter((p) => p.status === "completed").length;
  const required = modules.filter((m) => m.required).length;
  const completedRequired = modules
    .filter((m) => m.required)
    .filter((m) => progressMap[m.id]?.status === "completed").length;
  const pct = modules.length > 0 ? Math.round((completed / modules.length) * 100) : 0;

  async function markStatus(moduleId: string, status: "not_started" | "in_progress" | "completed") {
    try {
      const res = await fetch("/api/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: moduleId, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setProgress((prev) => {
          const existing = prev.find((p) => p.module_id === moduleId);
          if (existing) return prev.map((p) => p.module_id === moduleId ? data.progress : p);
          return [...prev, data.progress];
        });
        toast.success(status === "completed" ? "Marked as complete!" : "Progress updated");
      } else {
        toast.error("Failed to update progress");
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function deleteModule(id: string) {
    const res = await fetch(`/api/training/${id}`, { method: "DELETE" });
    if (res.ok) {
      setModules((prev) => prev.filter((m) => m.id !== id));
      setSelectedModule(null);
      toast.success("Module deleted");
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#F8FAFC] text-xl font-semibold">Training Hub</h1>
            <p className="text-[#94A3B8] text-sm mt-0.5">
              {completed}/{modules.length} modules completed
              {required > 0 && ` · ${completedRequired}/${required} required`}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium transition-colors"
            >
              + Add Module
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!isAdmin && modules.length > 0 && (
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2 text-xs text-[#94A3B8]">
              <span>Overall completion</span>
              <span className="text-[#F97316] font-semibold">{pct}%</span>
            </div>
            <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
              <div className="h-full bg-[#F97316] rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Module grid */}
        {modules.length === 0 ? (
          <div className="text-center py-16 text-[#475569]">
            {isAdmin ? "No training modules yet. Add the first one." : "No training modules available yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => {
              const prog = progressMap[mod.id];
              const status = prog?.status ?? "not_started";
              return (
                <div
                  key={mod.id}
                  className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-col gap-3 hover:border-[#475569] transition-colors cursor-pointer"
                  onClick={() => setSelectedModule(mod)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[#F8FAFC] font-semibold text-sm leading-snug">{mod.title}</p>
                      {mod.required && (
                        <span className="text-[10px] text-[#F97316] font-medium">Required</span>
                      )}
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded border text-xs flex-shrink-0 ${TYPE_COLOURS[mod.type] ?? ""}`}>
                      {TYPE_LABELS[mod.type] ?? mod.type}
                    </span>
                  </div>

                  {mod.description && (
                    <p className="text-[#94A3B8] text-xs leading-relaxed line-clamp-2">{mod.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-1">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-xs ${STATUS_COLOURS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                    {!isAdmin && status !== "completed" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markStatus(mod.id, "completed"); }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Mark done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Module detail modal */}
      {selectedModule && (
        <ModuleDetailModal
          module={selectedModule}
          progress={progressMap[selectedModule.id] ?? null}
          isAdmin={isAdmin}
          tutorId={tutorId}
          onClose={() => setSelectedModule(null)}
          onMarkStatus={(status) => markStatus(selectedModule.id, status)}
          onDelete={() => deleteModule(selectedModule.id)}
          onUpdated={(updated) => {
            setModules((prev) => prev.map((m) => m.id === updated.id ? updated : m));
            setSelectedModule(updated);
            toast.success("Module updated");
          }}
        />
      )}

      {/* Add module modal */}
      {showAddModal && (
        <AddModuleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(mod) => {
            setModules((prev) => [...prev, mod]);
            setShowAddModal(false);
            toast.success("Module added");
          }}
        />
      )}
    </>
  );
}

// ─── Module Detail Modal ──────────────────────────────────────────────────────

function ModuleDetailModal({
  module: mod,
  progress,
  isAdmin,
  onClose,
  onMarkStatus,
  onDelete,
  onUpdated,
}: {
  module: TrainingModule;
  progress: ProgressRow | null;
  isAdmin: boolean;
  tutorId: string;
  onClose: () => void;
  onMarkStatus: (status: "not_started" | "in_progress" | "completed") => void;
  onDelete: () => void;
  onUpdated: (updated: TrainingModule) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: mod.title,
    description: mod.description ?? "",
    type: mod.type,
    content_url: mod.content_url ?? "",
    content: mod.content ?? "",
    required: mod.required,
    order_index: mod.order_index,
  });

  const status = progress?.status ?? "not_started";

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/training/${mod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          type: form.type,
          content_url: form.content_url || null,
          content: form.content || null,
          required: form.required,
          order_index: form.order_index,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      onUpdated(data.module);
      setEditing(false);
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
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#334155] sticky top-0 bg-[#1E293B]">
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2 py-0.5 rounded border text-xs ${TYPE_COLOURS[mod.type] ?? ""}`}>
                {TYPE_LABELS[mod.type]}
              </span>
              {mod.required && <span className="text-[10px] text-[#F97316] font-medium">Required</span>}
            </div>
            <button onClick={onClose} className="text-[#475569] hover:text-[#94A3B8] text-lg leading-none">×</button>
          </div>

          <div className="p-6 space-y-4">
            {editing && isAdmin ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="input-base resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">Type</label>
                    <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TrainingModule["type"] }))} className="input-base">
                      <option value="sop">SOP</option>
                      <option value="video">Video</option>
                      <option value="document">Document</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">Order Index</label>
                    <input type="number" value={form.order_index} onChange={(e) => setForm((f) => ({ ...f, order_index: Number(e.target.value) }))} className="input-base" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Content URL (video/document)</label>
                  <input type="text" value={form.content_url} onChange={(e) => setForm((f) => ({ ...f, content_url: e.target.value }))} placeholder="https://..." className="input-base" />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Markdown Content (SOP)</label>
                  <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={8} className="input-base resize-none text-xs font-mono" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="req" checked={form.required} onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))} className="accent-[#F97316]" />
                  <label htmlFor="req" className="text-[#94A3B8] text-sm">Required for all tutors</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white text-sm font-medium transition-colors">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-lg border border-[#334155] text-[#94A3B8] text-sm transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-[#F8FAFC] text-lg font-bold">{mod.title}</h2>
                {mod.description && <p className="text-[#94A3B8] text-sm">{mod.description}</p>}

                {/* SOP content */}
                {mod.type === "sop" && mod.content && (
                  <div
                    className="prose prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(mod.content) }}
                  />
                )}

                {/* Video embed */}
                {mod.type === "video" && mod.content_url && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-[#0F172A]">
                    <iframe
                      src={mod.content_url}
                      className="w-full h-full"
                      allowFullScreen
                      title={mod.title}
                    />
                  </div>
                )}

                {/* Document download */}
                {mod.type === "document" && mod.content_url && (
                  <a
                    href={mod.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#334155] text-[#F8FAFC] text-sm hover:bg-[#475569] transition-colors"
                  >
                    Download Document →
                  </a>
                )}

                {/* Progress controls */}
                {!isAdmin && (
                  <div className="border-t border-[#334155] pt-4 flex items-center gap-3">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-xs ${STATUS_COLOURS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                    {status !== "completed" && (
                      <button
                        onClick={() => onMarkStatus("completed")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors"
                      >
                        Mark as Completed
                      </button>
                    )}
                    {status === "not_started" && (
                      <button
                        onClick={() => onMarkStatus("in_progress")}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-medium transition-colors"
                      >
                        Start Module
                      </button>
                    )}
                  </div>
                )}

                {/* Admin actions */}
                {isAdmin && (
                  <div className="border-t border-[#334155] pt-4 flex gap-2">
                    <button onClick={() => setEditing(true)}
                      className="flex-1 py-2 rounded-lg border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors">
                      Edit Module
                    </button>
                    <button onClick={onDelete}
                      className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors">
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Add Module Modal ─────────────────────────────────────────────────────────

function AddModuleModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (mod: TrainingModule) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "sop" as const,
    content_url: "",
    content: "",
    required: false,
    order_index: 0,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return;
    setSaving(true);
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          type: form.type,
          content_url: form.content_url || null,
          content: form.content || null,
          required: form.required,
          order_index: form.order_index,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      onSuccess(data.module);
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#334155] sticky top-0 bg-[#1E293B]">
            <h2 className="text-[#F8FAFC] font-semibold">Add Training Module</h2>
            <button onClick={onClose} className="text-[#475569] hover:text-[#94A3B8] text-lg leading-none">×</button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Field label="Title" required>
              <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-base" required />
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="input-base resize-none" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type" required>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))} className="input-base">
                  <option value="sop">SOP (markdown)</option>
                  <option value="video">Video (embed)</option>
                  <option value="document">Document (link)</option>
                </select>
              </Field>
              <Field label="Order">
                <input type="number" value={form.order_index} onChange={(e) => setForm((f) => ({ ...f, order_index: Number(e.target.value) }))} className="input-base" min={0} />
              </Field>
            </div>
            {(form.type === "video" || form.type === "document") && (
              <Field label="URL">
                <input type="text" value={form.content_url} onChange={(e) => setForm((f) => ({ ...f, content_url: e.target.value }))} placeholder="https://..." className="input-base" />
              </Field>
            )}
            {form.type === "sop" && (
              <Field label="Markdown Content">
                <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={6} className="input-base resize-none text-xs font-mono" placeholder="# Title&#10;&#10;## Section&#10;&#10;Content..." />
              </Field>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="req2" checked={form.required} onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))} className="accent-[#F97316]" />
              <label htmlFor="req2" className="text-[#94A3B8] text-sm">Required for all tutors</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {saving ? "Adding..." : "Add Module"}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-[#334155] text-[#94A3B8] text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
