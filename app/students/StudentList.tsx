"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AddStudentModal from "./AddStudentModal";

type StudentRow = {
  id: string;
  full_name: string;
  year_group: number;
  exam_board: string;
  qualification: string;
  tier: string | null;
  current_grade: string | null;
  target_grade: string;
  status: string;
  assigned_tutor_id: string | null;
  payment_status: string | null;
  tutor: { full_name: string } | null;
  progressPct: number;
  covered: number;
  totalTopics: number;
};

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  churned: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PAYMENT_COLOURS: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  trial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  free: "bg-[#334155] text-[#94A3B8] border-[#475569]",
};

export default function StudentList({
  students,
  tutors,
  isAdmin,
}: {
  students: StudentRow[];
  tutors: { id: string; full_name: string }[];
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterTutor, setFilterTutor] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (search && !s.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterYear !== "all" && String(s.year_group) !== filterYear) return false;
      if (filterTutor !== "all" && s.assigned_tutor_id !== filterTutor) return false;
      return true;
    });
  }, [students, search, filterStatus, filterYear, filterTutor]);

  const years = Array.from(new Set(students.map((s) => s.year_group))).sort();

  return (
    <>
    {showAddModal && (
      <AddStudentModal tutors={tutors} onClose={() => setShowAddModal(false)} />
    )}
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F8FAFC] text-xl font-semibold">Students</h1>
          <p className="text-[#94A3B8] text-sm mt-0.5">
            {students.length} student{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium transition-colors"
          >
            + Add Student
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base flex-1 min-w-48"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-base w-auto"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="churned">Churned</option>
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="input-base w-auto"
        >
          <option value="all">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </select>
        {isAdmin && tutors.length > 0 && (
          <select
            value={filterTutor}
            onChange={(e) => setFilterTutor(e.target.value)}
            className="input-base w-auto"
          >
            <option value="all">All tutors</option>
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#475569]">No students found</div>
      ) : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#334155] text-[#475569] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Year</th>
                  <th className="text-left px-4 py-3 font-medium">Curriculum</th>
                  <th className="text-left px-4 py-3 font-medium">Grade</th>
                  {isAdmin && <th className="text-left px-4 py-3 font-medium">Tutor</th>}
                  <th className="text-left px-4 py-3 font-medium">Progress</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-b border-[#334155] last:border-0 hover:bg-[#334155]/30 transition-colors cursor-pointer ${
                      i % 2 === 0 ? "" : "bg-[#0F172A]/20"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="block">
                        <div className="flex items-center gap-2">
                          <span className="text-[#F8FAFC] font-medium">{s.full_name}</span>
                          {s.payment_status && s.payment_status !== "free" && (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs border capitalize ${PAYMENT_COLOURS[s.payment_status] ?? ""}`}>
                              {s.payment_status}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">
                      <Link href={`/students/${s.id}`} className="block">
                        Y{s.year_group}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">
                      <Link href={`/students/${s.id}`} className="block">
                        {s.qualification} · {s.exam_board}
                        {s.tier && s.tier !== "N/A" && (
                          <span className="text-[#475569]"> · {s.tier}</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="block">
                        <span className="text-[#94A3B8]">
                          {s.current_grade ?? "—"}
                          <span className="text-[#475569]"> → </span>
                          <span className="text-[#F8FAFC]">{s.target_grade}</span>
                        </span>
                      </Link>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-[#94A3B8]">
                        <Link href={`/students/${s.id}`} className="block">
                          {s.tutor?.full_name ?? <span className="text-[#475569]">Unassigned</span>}
                        </Link>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="block">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-[#334155] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#F97316] rounded-full transition-all"
                              style={{ width: `${s.progressPct}%` }}
                            />
                          </div>
                          <span className="text-[#94A3B8] text-xs">{s.progressPct}%</span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="block">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${
                            STATUS_COLOURS[s.status] ?? ""
                          }`}
                        >
                          {s.status}
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#334155]">
            {filtered.map((s) => (
              <Link
                key={s.id}
                href={`/students/${s.id}`}
                className="block px-4 py-4 hover:bg-[#334155]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[#F8FAFC] font-medium">{s.full_name}</p>
                      {s.payment_status && s.payment_status !== "free" && (
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs border capitalize ${PAYMENT_COLOURS[s.payment_status] ?? ""}`}>
                          {s.payment_status}
                        </span>
                      )}
                    </div>
                    <p className="text-[#94A3B8] text-xs mt-0.5">
                      Y{s.year_group} · {s.qualification} {s.exam_board}
                      {s.tier && s.tier !== "N/A" ? ` · ${s.tier}` : ""}
                    </p>
                    {isAdmin && s.tutor && (
                      <p className="text-[#475569] text-xs mt-0.5">{s.tutor.full_name}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border capitalize flex-shrink-0 ${
                      STATUS_COLOURS[s.status] ?? ""
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#334155] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F97316] rounded-full"
                      style={{ width: `${s.progressPct}%` }}
                    />
                  </div>
                  <span className="text-[#94A3B8] text-xs">{s.progressPct}%</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
