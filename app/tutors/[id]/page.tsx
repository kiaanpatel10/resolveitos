"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

type TutorProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

type StudentRow = {
  id: string;
  full_name: string;
  year_group: number;
  qualification: string;
  exam_board: string;
  tier: string | null;
  target_grade: string;
  status: string;
};

type SessionRow = {
  id: string;
  session_date: string;
  session_type: string;
  duration_minutes: number;
  student_engagement: string | null;
  comprehension: string | null;
  student: { full_name: string } | null;
};

type AllStudent = StudentRow & { assigned_tutor_id: string | null };

const ENGAGEMENT_COLOUR: Record<string, string> = {
  excellent: "text-emerald-400",
  good: "text-blue-400",
  average: "text-amber-400",
  poor: "text-red-400",
};

const COMPREHENSION_COLOUR: Record<string, string> = {
  mastered: "text-amber-400",
  confident: "text-emerald-400",
  developing: "text-blue-400",
  struggling: "text-red-400",
};

export default function TutorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const tutorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [allStudents, setAllStudents] = useState<AllStudent[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tutorRes, allStudentsRes] = await Promise.all([
        fetch(`/api/tutors/${tutorId}`),
        fetch("/api/students"),
      ]);
      if (!tutorRes.ok) {
        router.push("/tutors");
        return;
      }
      const tutorData = await tutorRes.json();
      const studentsData = await allStudentsRes.json();
      setTutor(tutorData.tutor);
      setStudents(tutorData.students ?? []);
      setSessions(tutorData.sessions ?? []);
      setAllStudents(studentsData.students ?? []);
    } catch {
      toast.error("Failed to load tutor data");
    } finally {
      setLoading(false);
    }
  }, [tutorId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign(studentId: string) {
    setAssigning(true);
    try {
      const res = await fetch(`/api/tutors/${tutorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assign: studentId }),
      });
      if (!res.ok) {
        toast.error("Failed to assign student");
        return;
      }
      toast.success("Student assigned");
      setShowAssign(false);
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(studentId: string, studentName: string) {
    if (!confirm(`Unassign ${studentName} from this tutor?`)) return;
    try {
      const res = await fetch(`/api/tutors/${tutorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unassign: studentId }),
      });
      if (!res.ok) {
        toast.error("Failed to unassign student");
        return;
      }
      toast.success("Student unassigned");
      await load();
    } catch {
      toast.error("Network error");
    }
  }

  const unassignedStudents = allStudents.filter(
    (s) => !s.assigned_tutor_id || s.assigned_tutor_id === tutorId
      ? s.assigned_tutor_id !== tutorId
      : false
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <p className="text-[#475569] text-sm">Loading...</p>
      </div>
    );
  }

  if (!tutor) return null;

  const totalSessions = sessions.length;
  const avgEngagement = sessions
    .filter((s) => s.student_engagement)
    .reduce((acc, s) => {
      const map: Record<string, number> = { excellent: 4, good: 3, average: 2, poor: 1 };
      return acc + (map[s.student_engagement!] ?? 0);
    }, 0) / (sessions.filter((s) => s.student_engagement).length || 1);

  const engagementLabel =
    avgEngagement >= 3.5 ? "Excellent" :
    avgEngagement >= 2.5 ? "Good" :
    avgEngagement >= 1.5 ? "Average" : "Needs attention";

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Inline nav - no server component available in client page */}
      <div className="border-b border-[#334155] bg-[#1E293B]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/tutors" className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm transition-colors flex items-center gap-1.5">
            ← Tutors
          </Link>
          <span className="text-[#334155]">/</span>
          <span className="text-[#F8FAFC] text-sm font-medium">{tutor.full_name}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Tutor header */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[#F8FAFC] text-2xl font-bold">{tutor.full_name}</h1>
              <p className="text-[#94A3B8] text-sm mt-1">{tutor.email}</p>
              {tutor.phone && <p className="text-[#475569] text-sm">{tutor.phone}</p>}
              <p className="text-[#475569] text-xs mt-1">
                Joined {new Date(tutor.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#3B82F6]">{students.length}</p>
                <p className="text-[#475569] text-xs mt-0.5">Students</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#F97316]">{totalSessions}</p>
                <p className="text-[#475569] text-xs mt-0.5">Sessions</p>
              </div>
              <div className="text-center">
                <p className={`text-sm font-semibold mt-1 ${
                  avgEngagement >= 3 ? "text-emerald-400" : avgEngagement >= 2 ? "text-amber-400" : "text-red-400"
                }`}>
                  {engagementLabel}
                </p>
                <p className="text-[#475569] text-xs mt-0.5">Avg engagement</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Students */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#334155] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[#F8FAFC] font-semibold text-sm">Assigned Students</h2>
                <span className="text-xs text-[#475569]">({students.length})</span>
              </div>
              <button
                onClick={() => setShowAssign(true)}
                className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
              >
                + Assign
              </button>
            </div>
            {students.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[#475569] text-sm">No students assigned yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#334155]">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/students/${s.id}`}
                        className="text-[#F8FAFC] text-sm font-medium hover:text-[#F97316] transition-colors"
                      >
                        {s.full_name}
                      </Link>
                      <p className="text-[#475569] text-xs">
                        Year {s.year_group} · {s.qualification} {s.exam_board}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                          s.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : s.status === "paused"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {s.status}
                      </span>
                      <button
                        onClick={() => handleUnassign(s.id, s.full_name)}
                        className="text-xs text-[#475569] hover:text-red-400 transition-colors"
                      >
                        Unassign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#334155] flex items-center gap-2">
              <h2 className="text-[#F8FAFC] font-semibold text-sm">Recent Sessions</h2>
              <span className="text-xs text-[#475569]">({sessions.length})</span>
            </div>
            {sessions.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[#475569] text-sm">No sessions logged yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#334155]">
                {sessions.map((s) => (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[#F8FAFC] text-sm font-medium">
                        {(s.student as { full_name: string } | null)?.full_name ?? "Unknown"}
                      </p>
                      <span className="text-[#475569] text-xs flex-shrink-0">
                        {new Date(s.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#334155] text-[#94A3B8] capitalize">
                        {s.session_type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-[#475569]">{s.duration_minutes}m</span>
                      {s.student_engagement && (
                        <span className={`text-xs ${ENGAGEMENT_COLOUR[s.student_engagement] ?? ""}`}>
                          {s.student_engagement}
                        </span>
                      )}
                      {s.comprehension && (
                        <span className={`text-xs ${COMPREHENSION_COLOUR[s.comprehension] ?? ""}`}>
                          · {s.comprehension}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign student modal */}
      {showAssign && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowAssign(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#334155]">
                <h2 className="text-[#F8FAFC] font-semibold">Assign Student</h2>
                <button onClick={() => setShowAssign(false)} className="text-[#475569] hover:text-[#94A3B8] text-lg leading-none">
                  ×
                </button>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto">
                {unassignedStudents.length === 0 ? (
                  <p className="text-[#475569] text-sm text-center py-6">All students are already assigned</p>
                ) : (
                  <div className="space-y-1">
                    {unassignedStudents.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleAssign(s.id)}
                        disabled={assigning}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#334155] transition-colors text-left disabled:opacity-50"
                      >
                        <div>
                          <p className="text-[#F8FAFC] text-sm">{s.full_name}</p>
                          <p className="text-[#475569] text-xs">
                            Year {s.year_group} · {s.qualification} · {s.exam_board}
                          </p>
                        </div>
                        <span className="text-[#3B82F6] text-xs">Assign →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
