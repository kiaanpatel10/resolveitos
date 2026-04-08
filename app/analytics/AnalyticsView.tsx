"use client";

import { useMemo, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

interface Props {
  sessions: AnyRow[];
  tutors: AnyRow[];
  students: AnyRow[];
  progress: AnyRow[];
}

const BRAND = {
  accent: "#6366F1",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  slate: "#334155",
  text: "#F8FAFC",
  muted: "#94A3B8",
  card: "#1E293B",
  border: "#334155",
};

const CHART_COLOURS = [
  "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#84CC16",
];

function colour(i: number) {
  return CHART_COLOURS[i % CHART_COLOURS.length];
}

// ─── Simple bar chart ───────────────────────────────────────────────────────
function BarChart({
  data,
  height = 160,
  label,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  label?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.max(20, Math.floor(560 / Math.max(data.length, 1)) - 8);

  return (
    <div>
      {label && <p className="text-xs text-[#94A3B8] mb-2">{label}</p>}
      <svg
        viewBox={`0 0 ${Math.max(data.length * (barW + 8), 100)} ${height + 40}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((d, i) => {
          const barH = Math.max(2, (d.value / max) * height);
          const x = i * (barW + 8);
          const y = height - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={d.color ?? colour(i)}
                rx={3}
              />
              <text
                x={x + barW / 2}
                y={height + 14}
                textAnchor="middle"
                fontSize={9}
                fill={BRAND.muted}
              >
                {d.label.length > 10 ? d.label.slice(0, 9) + "…" : d.label}
              </text>
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={9}
                fill={BRAND.text}
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Simple line chart ──────────────────────────────────────────────────────
function LineChart({
  series,
  height = 160,
  label,
}: {
  series: { label: string; points: { x: string; y: number }[]; color?: string }[];
  height?: number;
  label?: string;
}) {
  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const maxY = Math.max(...allY, 1);
  const allX = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.x)))).sort();
  const W = 560;
  const stepX = allX.length > 1 ? W / (allX.length - 1) : W;

  function px(xi: number, yi: number) {
    return `${xi * stepX},${height - (yi / maxY) * height}`;
  }

  return (
    <div>
      {label && <p className="text-xs text-[#94A3B8] mb-2">{label}</p>}
      <svg viewBox={`0 0 ${W} ${height + 30}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* x axis labels */}
        {allX.map((x, i) => (
          <text
            key={x}
            x={i * stepX}
            y={height + 18}
            textAnchor="middle"
            fontSize={8}
            fill={BRAND.muted}
          >
            {x.slice(5)} {/* MM-DD */}
          </text>
        ))}
        {series.map((s, si) => {
          const pts = allX.map((x) => {
            const found = s.points.find((p) => p.x === x);
            return found ? found.y : 0;
          });
          const pointStr = pts.map((y, i) => px(i, y)).join(" ");
          return (
            <g key={si}>
              <polyline
                points={pointStr}
                fill="none"
                stroke={s.color ?? colour(si)}
                strokeWidth={2}
              />
              {pts.map((y, i) => (
                <circle key={i} cx={i * stepX} cy={height - (y / maxY) * height} r={3} fill={s.color ?? colour(si)} />
              ))}
            </g>
          );
        })}
      </svg>
      {/* legend */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 mt-1">
          {series.map((s, si) => (
            <div key={si} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ background: s.color ?? colour(si) }} />
              <span className="text-xs text-[#94A3B8]">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#1E293B] rounded-xl p-4 border border-[#334155]">
      <p className="text-xs text-[#94A3B8] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#F8FAFC]">{value}</p>
      {sub && <p className="text-xs text-[#94A3B8] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Chart card ─────────────────────────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1E293B] rounded-xl p-5 border border-[#334155]">
      <h3 className="text-sm font-semibold text-[#F8FAFC] mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AnalyticsView({ sessions, tutors, students, progress }: Props) {
  const [tutorFilter, setTutorFilter] = useState("all");

  const filtered = useMemo(
    () => (tutorFilter === "all" ? sessions : sessions.filter((s) => s.tutor_id === tutorFilter)),
    [sessions, tutorFilter]
  );

  // ── 1. Session volume over time (weekly buckets) ──────────────────────────
  const volumeByWeek = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((s) => {
      const d = new Date(s.session_date);
      // Monday of the week
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      d.setDate(d.getDate() + diff);
      const key = d.toISOString().split("T")[0];
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([x, y]) => ({ x, y }));
  }, [filtered]);

  // ── 2. Topic frequency / difficulty ──────────────────────────────────────
  const topicStats = useMemo(() => {
    const map: Record<string, { count: number; engSum: number; compSum: number; rated: number }> = {};
    filtered.forEach((s) => {
      const eng = s.student_engagement;
      const comp = s.comprehension;
      (s.topics_covered ?? []).forEach((t: string) => {
        if (!map[t]) map[t] = { count: 0, engSum: 0, compSum: 0, rated: 0 };
        map[t].count++;
        if (eng !== null && comp !== null) {
          map[t].engSum += eng;
          map[t].compSum += comp;
          map[t].rated++;
        }
      });
    });
    return Object.entries(map)
      .map(([topic, v]) => ({
        topic,
        count: v.count,
        avgEng: v.rated ? +(v.engSum / v.rated).toFixed(1) : null,
        avgComp: v.rated ? +(v.compSum / v.rated).toFixed(1) : null,
        // "difficulty" = inverse of avg comprehension (lower comp = harder)
        difficulty: v.rated ? +(5 - v.compSum / v.rated).toFixed(1) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [filtered]);

  // ── 3. Tutor effectiveness ────────────────────────────────────────────────
  const tutorStats = useMemo(() => {
    const map: Record<string, { name: string; sessions: number; engSum: number; compSum: number; rated: number }> = {};
    filtered.forEach((s) => {
      const id = s.tutor_id;
      const name = s.tutor?.full_name ?? id;
      if (!map[id]) map[id] = { name, sessions: 0, engSum: 0, compSum: 0, rated: 0 };
      map[id].sessions++;
      if (s.student_engagement !== null && s.comprehension !== null) {
        map[id].engSum += s.student_engagement;
        map[id].compSum += s.comprehension;
        map[id].rated++;
      }
    });
    return Object.entries(map)
      .map(([, v]) => ({
        label: v.name.split(" ")[0],
        fullName: v.name,
        sessions: v.sessions,
        avgEng: v.rated ? +(v.engSum / v.rated).toFixed(1) : null,
        avgComp: v.rated ? +(v.compSum / v.rated).toFixed(1) : null,
      }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [filtered]);

  // ── 4. Engagement trend over time ────────────────────────────────────────
  const engagementTrend = useMemo(() => {
    const map: Record<string, { engSum: number; count: number }> = {};
    filtered.forEach((s) => {
      if (s.student_engagement === null) return;
      const week = (() => {
        const d = new Date(s.session_date);
        const day = d.getDay();
        const diff = (day === 0 ? -6 : 1 - day);
        d.setDate(d.getDate() + diff);
        return d.toISOString().split("T")[0];
      })();
      if (!map[week]) map[week] = { engSum: 0, count: 0 };
      map[week].engSum += s.student_engagement;
      map[week].count++;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([x, v]) => ({ x, y: +(v.engSum / v.count).toFixed(1) }));
  }, [filtered]);

  // ── 5. Curriculum coverage ────────────────────────────────────────────────
  const coverageStats = useMemo(() => {
    const curriculumMap: Record<string, { total: number; covered: number; mastered: number }> = {};
    progress.forEach((p) => {
      const student = students.find((s) => s.id === p.student_id);
      const curr = student?.curriculum ?? "Unknown";
      if (!curriculumMap[curr]) curriculumMap[curr] = { total: 0, covered: 0, mastered: 0 };
      curriculumMap[curr].total++;
      if (p.status === "in_progress" || p.status === "completed") curriculumMap[curr].covered++;
      if (p.status === "completed") curriculumMap[curr].mastered++;
    });
    return Object.entries(curriculumMap).map(([curriculum, v]) => ({
      curriculum,
      total: v.total,
      covered: v.covered,
      mastered: v.mastered,
      pct: v.total ? Math.round((v.covered / v.total) * 100) : 0,
    }));
  }, [progress, students]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalSessions = filtered.length;
  const totalMinutes = filtered.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
  const avgEngagement =
    filtered.filter((s) => s.student_engagement !== null).length > 0
      ? (
          filtered.reduce((acc, s) => acc + (s.student_engagement ?? 0), 0) /
          filtered.filter((s) => s.student_engagement !== null).length
        ).toFixed(1)
      : "—";
  const uniqueStudents = new Set(filtered.map((s) => s.student_id)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Analytics</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Last 90 days</p>
        </div>
        <select
          value={tutorFilter}
          onChange={(e) => setTutorFilter(e.target.value)}
          className="bg-[#1E293B] border border-[#334155] text-[#F8FAFC] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
        >
          <option value="all">All Tutors</option>
          {tutors.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Sessions" value={totalSessions} sub="in period" />
        <StatCard label="Hours Delivered" value={(totalMinutes / 60).toFixed(1)} sub="total" />
        <StatCard label="Avg Engagement" value={avgEngagement} sub="out of 5" />
        <StatCard label="Students Reached" value={uniqueStudents} sub="unique" />
      </div>

      {/* Session volume */}
      <ChartCard title="Session Volume (weekly)">
        {volumeByWeek.length > 0 ? (
          <LineChart
            series={[{ label: "Sessions", points: volumeByWeek, color: BRAND.accent }]}
            height={160}
          />
        ) : (
          <p className="text-sm text-[#94A3B8]">No sessions in this period.</p>
        )}
      </ChartCard>

      {/* Two-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic frequency */}
        <ChartCard title="Topic Frequency (top 15)">
          {topicStats.length > 0 ? (
            <BarChart
              data={topicStats.map((t, i) => ({ label: t.topic, value: t.count, color: colour(i) }))}
              height={140}
            />
          ) : (
            <p className="text-sm text-[#94A3B8]">No topic data.</p>
          )}
        </ChartCard>

        {/* Topic difficulty — lowest avg comprehension */}
        <ChartCard title="Topic Difficulty (avg comprehension, lower = harder)">
          {topicStats.filter((t) => t.avgComp !== null).length > 0 ? (
            <BarChart
              data={topicStats
                .filter((t) => t.avgComp !== null)
                .sort((a, b) => (a.avgComp ?? 5) - (b.avgComp ?? 5))
                .slice(0, 10)
                .map((t, i) => ({
                  label: t.topic,
                  value: t.avgComp ?? 0,
                  color: colour(i),
                }))}
              height={140}
              label="Average comprehension score (1–5)"
            />
          ) : (
            <p className="text-sm text-[#94A3B8]">No rated sessions yet.</p>
          )}
        </ChartCard>
      </div>

      {/* Tutor effectiveness table */}
      <ChartCard title="Tutor Effectiveness">
        {tutorStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[#334155]">
                  <th className="pb-2 text-[#94A3B8] font-medium">Tutor</th>
                  <th className="pb-2 text-[#94A3B8] font-medium text-right">Sessions</th>
                  <th className="pb-2 text-[#94A3B8] font-medium text-right">Avg Engagement</th>
                  <th className="pb-2 text-[#94A3B8] font-medium text-right">Avg Comprehension</th>
                </tr>
              </thead>
              <tbody>
                {tutorStats.map((t, i) => (
                  <tr key={i} className="border-b border-[#334155]/50">
                    <td className="py-2 text-[#F8FAFC]">{t.fullName}</td>
                    <td className="py-2 text-right text-[#F8FAFC]">{t.sessions}</td>
                    <td className="py-2 text-right">
                      {t.avgEng !== null ? (
                        <span
                          className="font-medium"
                          style={{ color: t.avgEng >= 4 ? BRAND.green : t.avgEng >= 3 ? BRAND.amber : BRAND.red }}
                        >
                          {t.avgEng}/5
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {t.avgComp !== null ? (
                        <span
                          className="font-medium"
                          style={{ color: t.avgComp >= 4 ? BRAND.green : t.avgComp >= 3 ? BRAND.amber : BRAND.red }}
                        >
                          {t.avgComp}/5
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">No tutor data.</p>
        )}
      </ChartCard>

      {/* Engagement trend */}
      <ChartCard title="Engagement Trend (weekly avg)">
        {engagementTrend.length > 0 ? (
          <LineChart
            series={[{ label: "Avg Engagement", points: engagementTrend, color: BRAND.green }]}
            height={140}
            label="Average engagement score (1–5)"
          />
        ) : (
          <p className="text-sm text-[#94A3B8]">No engagement data yet.</p>
        )}
      </ChartCard>

      {/* Curriculum coverage */}
      <ChartCard title="Curriculum Coverage">
        {coverageStats.length > 0 ? (
          <div className="space-y-3">
            {coverageStats.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#F8FAFC]">{c.curriculum}</span>
                  <span className="text-[#94A3B8]">
                    {c.covered}/{c.total} topics &middot; {c.mastered} mastered &middot; {c.pct}%
                  </span>
                </div>
                <div className="w-full bg-[#334155] rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${c.pct}%`, background: colour(i) }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">No progress data yet.</p>
        )}
      </ChartCard>
    </div>
  );
}
