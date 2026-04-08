"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  qualification: string | null;
  exam_board: string | null;
  difficulty: number | null;
  topic_id: string | null;
  created_at: string;
  topic: { name: string; category: string } | null;
};

type TopicRow = { id: string; name: string; category: string; qualification: string; exam_board: string };

const FILE_TYPE_LABELS: Record<string, string> = {
  worksheet: "Worksheet",
  past_paper: "Past Paper",
  mark_scheme: "Mark Scheme",
  notes: "Notes",
  video: "Video",
  other: "Other",
};

const FILE_TYPE_COLOURS: Record<string, string> = {
  worksheet: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  past_paper: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  mark_scheme: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  notes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  video: "bg-red-500/10 text-red-400 border-red-500/20",
  other: "bg-[#334155] text-[#94A3B8] border-[#475569]",
};

function DifficultyStars({ n }: { n: number | null }) {
  if (!n) return <span className="text-[#475569] text-xs">—</span>;
  return (
    <span className="text-xs">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < n ? "text-[#F97316]" : "text-[#334155]"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ResourceLibrary({
  resources: initialResources,
  topics,
  isAdmin,
}: {
  resources: Resource[];
  topics: TopicRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterQual, setFilterQual] = useState("");
  const [filterBoard, setFilterBoard] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const filtered = initialResources.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchTopic = r.topic?.name.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchTopic) return false;
    }
    if (filterQual && r.qualification !== filterQual) return false;
    if (filterBoard && r.exam_board !== filterBoard) return false;
    if (filterType && r.file_type !== filterType) return false;
    if (filterDifficulty && r.difficulty !== parseInt(filterDifficulty, 10)) return false;
    return true;
  });

  const hasFilters = search || filterQual || filterBoard || filterType || filterDifficulty;

  function clearFilters() {
    setSearch("");
    setFilterQual("");
    setFilterBoard("");
    setFilterType("");
    setFilterDifficulty("");
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="input-base pl-8"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#475569] text-sm">🔍</span>
        </div>

        <select
          value={filterQual}
          onChange={(e) => setFilterQual(e.target.value)}
          className="input-base w-auto text-sm"
        >
          <option value="">All qualifications</option>
          <option value="GCSE">GCSE</option>
          <option value="A-Level">A-Level</option>
        </select>

        <select
          value={filterBoard}
          onChange={(e) => setFilterBoard(e.target.value)}
          className="input-base w-auto text-sm"
        >
          <option value="">All boards</option>
          <option value="AQA">AQA</option>
          <option value="Edexcel">Edexcel</option>
          <option value="OCR">OCR</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input-base w-auto text-sm"
        >
          <option value="">All types</option>
          {Object.entries(FILE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="input-base w-auto text-sm"
        >
          <option value="">Any difficulty</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{"★".repeat(n)}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-[#475569] hover:text-[#94A3B8] transition-colors"
          >
            Clear
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="ml-auto px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium transition-colors flex-shrink-0"
          >
            + Upload Resource
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-[#475569] text-sm">
        {filtered.length} resource{filtered.length !== 1 ? "s" : ""}
        {hasFilters && ` matching filters`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-16 text-center">
          <span className="text-3xl">📚</span>
          <p className="text-[#475569] text-sm mt-3">
            {hasFilters ? "No resources match your filters" : "No resources uploaded yet"}
          </p>
          {isAdmin && !hasFilters && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium transition-colors"
            >
              Upload the first resource
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          topics={topics}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function ResourceCard({ resource: r }: { resource: Resource }) {
  const typeColour = FILE_TYPE_COLOURS[r.file_type] ?? FILE_TYPE_COLOURS.other;
  const typeLabel = FILE_TYPE_LABELS[r.file_type] ?? r.file_type;

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-col gap-3 hover:border-[#475569] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[#F8FAFC] font-medium text-sm leading-snug">{r.title}</p>
          {r.topic && (
            <p className="text-[#475569] text-xs mt-0.5 truncate">
              {r.topic.category} · {r.topic.name}
            </p>
          )}
        </div>
        <span className={`inline-flex px-2 py-0.5 rounded border text-xs flex-shrink-0 ${typeColour}`}>
          {typeLabel}
        </span>
      </div>

      {r.description && (
        <p className="text-[#94A3B8] text-xs leading-relaxed line-clamp-2">{r.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-3 text-xs text-[#475569]">
          {r.qualification && <span>{r.qualification}</span>}
          {r.exam_board && <span>{r.exam_board}</span>}
          <DifficultyStars n={r.difficulty} />
        </div>

        {r.file_url ? (
          <a
            href={r.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
          >
            Download →
          </a>
        ) : (
          <span className="text-xs text-[#475569]">No file</span>
        )}
      </div>
    </div>
  );
}

function UploadModal({
  topics,
  onClose,
  onSuccess,
}: {
  topics: TopicRow[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    file_type: "worksheet",
    qualification: "",
    exam_board: "",
    difficulty: "",
    topic_id: "",
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

  const filteredTopics = topics.filter((t) => {
    if (form.qualification && t.qualification !== form.qualification) return false;
    if (form.exam_board && t.exam_board !== form.exam_board) return false;
    return true;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("file_type", form.file_type);
      if (form.qualification) fd.append("qualification", form.qualification);
      if (form.exam_board) fd.append("exam_board", form.exam_board);
      if (form.difficulty) fd.append("difficulty", form.difficulty);
      if (form.topic_id) fd.append("topic_id", form.topic_id);
      if (file) fd.append("file", file);

      const res = await fetch("/api/resources", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      toast.success("Resource uploaded");
      onSuccess();
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
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#334155] sticky top-0 bg-[#1E293B]">
            <h2 className="text-[#F8FAFC] font-semibold">Upload Resource</h2>
            <button onClick={onClose} className="text-[#475569] hover:text-[#94A3B8] text-lg leading-none">×</button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Field label="Title" required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Algebra Worksheet — Foundation"
                className="input-base"
                required
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Brief description of the resource..."
                className="input-base resize-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Type" required>
                <select
                  value={form.file_type}
                  onChange={(e) => setForm((f) => ({ ...f, file_type: e.target.value }))}
                  className="input-base"
                >
                  {Object.entries(FILE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>

              <Field label="Difficulty">
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                  className="input-base"
                >
                  <option value="">Not set</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{"★".repeat(n)} ({n}/5)</option>
                  ))}
                </select>
              </Field>

              <Field label="Qualification">
                <select
                  value={form.qualification}
                  onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value, topic_id: "" }))}
                  className="input-base"
                >
                  <option value="">Any</option>
                  <option value="GCSE">GCSE</option>
                  <option value="A-Level">A-Level</option>
                </select>
              </Field>

              <Field label="Exam Board">
                <select
                  value={form.exam_board}
                  onChange={(e) => setForm((f) => ({ ...f, exam_board: e.target.value, topic_id: "" }))}
                  className="input-base"
                >
                  <option value="">Any</option>
                  <option value="AQA">AQA</option>
                  <option value="Edexcel">Edexcel</option>
                  <option value="OCR">OCR</option>
                </select>
              </Field>
            </div>

            <Field label="Linked Topic">
              <select
                value={form.topic_id}
                onChange={(e) => setForm((f) => ({ ...f, topic_id: e.target.value }))}
                className="input-base"
              >
                <option value="">Not linked to a topic</option>
                {filteredTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.category} — {t.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="File">
              <div className="relative">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="input-base file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-[#334155] file:text-[#94A3B8] hover:file:bg-[#475569] file:transition-colors cursor-pointer"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                />
              </div>
              <p className="text-[#475569] text-xs mt-1">PDF, Word, Excel, images accepted</p>
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {saving ? "Uploading..." : "Upload Resource"}
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
