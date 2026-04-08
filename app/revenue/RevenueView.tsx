"use client";

type InvoiceRow = {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_date: string | null;
  created_at: string;
};

type StudentRow = {
  id: string;
  full_name: string;
  payment_status: string | null;
  monthly_rate: number | null;
};

function getLast6Months(): { label: string; year: number; month: number }[] {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return months;
}

export default function RevenueView({
  invoices,
  students,
}: {
  invoices: InvoiceRow[];
  students: StudentRow[];
}) {
  // MRR: sum of monthly_rate for paid active students
  const mrr = students
    .filter((s) => s.payment_status === "paid" && s.monthly_rate)
    .reduce((sum, s) => sum + (s.monthly_rate ?? 0), 0);

  // Revenue this month: paid invoices with paid_date in current month
  const now = new Date();
  const thisMonthPaid = invoices
    .filter((i) => {
      if (i.status !== "paid" || !i.paid_date) return false;
      const d = new Date(i.paid_date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, i) => sum + i.amount, 0);

  // Outstanding: sent + overdue
  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

  // Total collected ever
  const totalCollected = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  // Payment status breakdown
  const statusCounts: Record<string, number> = { paid: 0, overdue: 0, trial: 0, free: 0 };
  for (const s of students) {
    const key = s.payment_status ?? "free";
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }

  // 6-month bar chart data: revenue per month (paid invoices by paid_date)
  const months = getLast6Months();
  const monthlyRevenue = months.map(({ year, month }) => {
    const total = invoices
      .filter((i) => {
        if (i.status !== "paid" || !i.paid_date) return false;
        const d = new Date(i.paid_date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, i) => sum + i.amount, 0);
    return total;
  });

  const maxBar = Math.max(...monthlyRevenue, 1);

  // SVG bar chart
  const BAR_W = 40;
  const BAR_GAP = 16;
  const CHART_H = 120;
  const PAD_TOP = 16;
  const PAD_BOT = 24;
  const innerH = CHART_H - PAD_TOP - PAD_BOT;
  const totalW = months.length * (BAR_W + BAR_GAP) + BAR_GAP;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[#F8FAFC] text-xl font-semibold">Revenue</h1>
        <p className="text-[#94A3B8] text-sm mt-0.5">Financial overview</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-[#475569] text-xs mb-1">MRR</p>
          <p className="text-[#F8FAFC] font-bold text-2xl">£{mrr.toFixed(0)}</p>
          <p className="text-[#475569] text-xs mt-0.5">monthly recurring</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-[#475569] text-xs mb-1">This Month</p>
          <p className="text-emerald-400 font-bold text-2xl">£{thisMonthPaid.toFixed(0)}</p>
          <p className="text-[#475569] text-xs mt-0.5">collected so far</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-[#475569] text-xs mb-1">Outstanding</p>
          <p className="text-red-400 font-bold text-2xl">£{outstanding.toFixed(0)}</p>
          <p className="text-[#475569] text-xs mt-0.5">sent + overdue</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-[#475569] text-xs mb-1">Total Collected</p>
          <p className="text-[#F8FAFC] font-bold text-2xl">£{totalCollected.toFixed(0)}</p>
          <p className="text-[#475569] text-xs mt-0.5">all time</p>
        </div>
      </div>

      {/* 6-month bar chart */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <p className="text-[#F8FAFC] font-semibold text-sm mb-4">Revenue — Last 6 Months</p>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${totalW} ${CHART_H}`}
            className="w-full"
            style={{ minWidth: totalW }}
          >
            {/* Gridlines */}
            {[0, 0.5, 1].map((frac) => {
              const y = PAD_TOP + innerH - frac * innerH;
              return (
                <g key={frac}>
                  <line
                    x1={0}
                    y1={y}
                    x2={totalW}
                    y2={y}
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={2}
                    y={y - 3}
                    fill="#475569"
                    fontSize={8}
                  >
                    £{(maxBar * frac).toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {months.map(({ label }, i) => {
              const val = monthlyRevenue[i];
              const barH = val > 0 ? Math.max(4, (val / maxBar) * innerH) : 0;
              const x = BAR_GAP + i * (BAR_W + BAR_GAP);
              const y = PAD_TOP + innerH - barH;
              return (
                <g key={label}>
                  <rect
                    x={x}
                    y={y}
                    width={BAR_W}
                    height={barH}
                    rx={4}
                    fill="#F97316"
                    opacity={val > 0 ? 1 : 0.15}
                  />
                  <text
                    x={x + BAR_W / 2}
                    y={CHART_H - 4}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize={9}
                  >
                    {label}
                  </text>
                  {val > 0 && (
                    <text
                      x={x + BAR_W / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fill="#F97316"
                      fontSize={8}
                    >
                      £{val.toFixed(0)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Payment status breakdown */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <p className="text-[#F8FAFC] font-semibold text-sm mb-4">Payment Status — Active Students</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: "paid", label: "Paid", colour: "text-emerald-400" },
            { key: "overdue", label: "Overdue", colour: "text-red-400" },
            { key: "trial", label: "Trial", colour: "text-amber-400" },
            { key: "free", label: "Free", colour: "text-[#94A3B8]" },
          ].map(({ key, label, colour }) => (
            <div key={key} className="text-center">
              <p className={`font-bold text-3xl ${colour}`}>{statusCounts[key] ?? 0}</p>
              <p className="text-[#475569] text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
