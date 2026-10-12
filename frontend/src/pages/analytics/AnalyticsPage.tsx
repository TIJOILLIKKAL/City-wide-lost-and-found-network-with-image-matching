import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Package, ClipboardList, Clock, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyticsApi } from "@/api/analytics";
import type { AnalyticsDailyPoint } from "@/types";

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["analytics-overview", days],
    queryFn: () => analyticsApi.getOverview(days),
  });

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ["analytics-daily", days],
    queryFn: () => analyticsApi.getDaily(days),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm">Platform activity overview</p>
        </div>
        <div className="flex gap-1 border rounded-lg p-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={days === r.value ? "default" : "ghost"}
              onClick={() => setDays(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {overviewLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : overview ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<Package className="h-5 w-5 text-blue-500" />}
              label="Found Items"
              value={overview.items.found_total}
              sub={`+${overview.items.found_new} new`}
            />
            <KpiCard
              icon={<Package className="h-5 w-5 text-orange-500" />}
              label="Archived"
              value={overview.items.found_archived}
              sub="expired items"
            />
            <KpiCard
              icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
              label="Lost Reports"
              value={overview.items.lost_total}
              sub={`+${overview.items.lost_new} new`}
            />
            <KpiCard
              icon={<ClipboardList className="h-5 w-5 text-green-500" />}
              label="Total Claims"
              value={overview.claims.total}
              sub={`+${overview.claims.new} new`}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<ClipboardList className="h-5 w-5 text-yellow-500" />}
              label="Pending Claims"
              value={overview.claims.pending}
              sub="awaiting review"
            />
            <KpiCard
              icon={<ClipboardList className="h-5 w-5 text-green-500" />}
              label="Approved"
              value={overview.claims.approved}
              sub="claims"
            />
            <KpiCard
              icon={<Clock className="h-5 w-5 text-slate-500" />}
              label="Avg Resolution"
              value={
                overview.avg_resolution_hours != null
                  ? `${overview.avg_resolution_hours.toFixed(1)}h`
                  : "—"
              }
              sub="pending → approved"
            />
            <KpiCard
              icon={<Target className="h-5 w-5 text-emerald-500" />}
              label="Match Rate"
              value={
                overview.match_rate_pct != null
                  ? `${overview.match_rate_pct.toFixed(1)}%`
                  : "—"
              }
              sub="claims resolved"
            />
          </div>
        </>
      ) : null}

      {/* Daily chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <div className="h-48 bg-muted animate-pulse rounded" />
          ) : daily?.days.length ? (
            <BarChartSvg data={daily.days} />
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">No data for this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm text-muted-foreground">{label}</span></div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Inline SVG bar chart (no external lib) ────────────────────────────────────

function BarChartSvg({ data }: { data: AnalyticsDailyPoint[] }) {
  const W = 800;
  const H = 200;
  const PAD = { top: 12, right: 16, bottom: 36, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.found_items, d.lost_items, d.claims]), 1);
  const n = data.length;
  const groupW = chartW / n;
  const barW = Math.max(2, groupW * 0.22);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxVal));

  const series = [
    { key: "found_items" as const, color: "#3b82f6", label: "Found" },
    { key: "lost_items" as const, color: "#a855f7", label: "Lost" },
    { key: "claims" as const, color: "#22c55e", label: "Claims" },
  ];

  const toY = (v: number) => chartH - (v / maxVal) * chartH;

  // Show every Nth label to avoid crowding
  const labelEvery = Math.max(1, Math.ceil(n / 10));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 360 }}>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Y-axis grid + labels */}
          {yTicks.map((v) => {
            const y = toY(v);
            return (
              <g key={v}>
                <line x1={0} x2={chartW} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.08} />
                <text x={-6} y={y + 4} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.5}>
                  {v}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const cx = i * groupW + groupW / 2;
            return (
              <g key={d.date}>
                {series.map((s, si) => {
                  const offset = (si - 1) * (barW + 1.5);
                  const h = Math.max(1, (d[s.key] / maxVal) * chartH);
                  return (
                    <rect
                      key={s.key}
                      x={cx + offset - barW / 2}
                      y={toY(d[s.key])}
                      width={barW}
                      height={h}
                      fill={s.color}
                      rx={1.5}
                      opacity={0.85}
                    />
                  );
                })}
                {i % labelEvery === 0 && (
                  <text
                    x={cx}
                    y={chartH + 16}
                    textAnchor="middle"
                    fontSize={9}
                    fill="currentColor"
                    fillOpacity={0.5}
                  >
                    {d.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-2">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
