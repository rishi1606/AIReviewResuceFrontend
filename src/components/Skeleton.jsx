import React from "react";

// Base skeleton block with pulse animation
export const SkeletonBase = ({ className = "", style = {} }) => (
  <div
    className={`bg-slate-200/70 rounded-xl animate-pulse ${className}`}
    style={style}
  />
);

// ─── KPI Card Skeleton ───
export const SkeletonKPI = () => (
  <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3 shadow-sm">
    <div className="flex items-center justify-between">
      <SkeletonBase className="h-3 w-24 rounded-lg" />
      <SkeletonBase className="h-8 w-8 rounded-xl" />
    </div>
    <SkeletonBase className="h-8 w-20 rounded-lg" />
    <SkeletonBase className="h-2.5 w-16 rounded-lg" />
  </div>
);

// ─── Chart Skeleton (matches ~400px chart area) ───
export const SkeletonChart = ({ height = 400 }) => (
  <div className="glass-card p-6" style={{ height }}>
    <div className="flex justify-between items-center mb-6">
      <SkeletonBase className="h-5 w-40 rounded-lg" />
      <SkeletonBase className="h-8 w-28 rounded-lg" />
    </div>
    <div className="flex items-end gap-3 h-[calc(100%-60px)] pt-4 pb-2 px-2">
      {[65, 80, 45, 90, 55, 70, 40, 85, 60, 75].map((h, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end h-full">
          <SkeletonBase
            className="w-full rounded-t-md"
            style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
          />
        </div>
      ))}
    </div>
  </div>
);

// ─── Small Chart Skeleton (for pie / small charts) ───
export const SkeletonChartSmall = () => (
  <div className="glass-card p-6 h-[300px]">
    <SkeletonBase className="h-4 w-36 rounded-lg mb-5" />
    <div className="flex items-center justify-center h-[calc(100%-60px)]">
      <SkeletonBase className="w-36 h-36 rounded-full" />
    </div>
  </div>
);

// ─── Review Card Skeleton ───
export const SkeletonReview = () => (
  <div className="flex gap-4 py-3">
    <SkeletonBase className="w-10 h-10 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <SkeletonBase className="h-4 w-32 rounded-lg" />
      <SkeletonBase className="h-3 w-48 rounded-lg" />
      <SkeletonBase className="h-3 w-full rounded-lg" />
      <SkeletonBase className="h-3 w-3/4 rounded-lg" />
    </div>
  </div>
);

// ─── Review List Card Skeleton (full width card like Reviews page) ───
export const SkeletonReviewCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-sm">
    <div className="flex items-start gap-4">
      <SkeletonBase className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="flex items-center justify-between">
          <SkeletonBase className="h-4 w-40 rounded-lg" />
          <SkeletonBase className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBase className="h-3 w-20 rounded-lg" />
          <SkeletonBase className="h-3 w-24 rounded-lg" />
          <SkeletonBase className="h-3 w-16 rounded-lg" />
        </div>
        <SkeletonBase className="h-3 w-full rounded-lg" />
        <SkeletonBase className="h-3 w-5/6 rounded-lg" />
      </div>
    </div>
    <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
      <SkeletonBase className="h-6 w-20 rounded-full" />
      <SkeletonBase className="h-6 w-24 rounded-full" />
      <SkeletonBase className="h-6 w-16 rounded-full" />
      <div className="flex-1" />
      <SkeletonBase className="h-7 w-28 rounded-lg" />
    </div>
  </div>
);

// ─── Ticket Row Skeleton ───
export const SkeletonTicketRow = () => (
  <tr>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonBase className="w-2 h-2 rounded-full" />
          <SkeletonBase className="h-4 w-56 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBase className="h-3 w-16 rounded-lg" />
          <SkeletonBase className="h-3 w-12 rounded-md" />
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <SkeletonBase className="h-5 w-24 rounded-md" />
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <SkeletonBase className="h-4 w-28 rounded-lg" />
        <div className="flex gap-1">
          {[1,2,3,4,5].map(i => (
            <SkeletonBase key={i} className="w-1.5 h-1.5 rounded-full" />
          ))}
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <SkeletonBase className="h-3 w-20 rounded-lg" />
        <SkeletonBase className="h-1.5 w-24 rounded-full" />
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <SkeletonBase className="w-7 h-7 rounded-full" />
        <SkeletonBase className="h-3 w-20 rounded-lg" />
      </div>
    </td>
  </tr>
);

// ─── Table Skeleton (generic) ───
export const SkeletonTable = ({ rows = 5, cols = 5 }) => (
  <div className="glass-card overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <SkeletonBase className="h-4 w-32 rounded-lg" />
      <SkeletonBase className="h-3 w-20 rounded-lg" />
    </div>
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-6 py-3">
              <SkeletonBase className="h-3 w-20 rounded-lg" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, row) => (
          <tr key={row}>
            {Array.from({ length: cols }).map((_, col) => (
              <td key={col} className="px-6 py-3">
                <SkeletonBase
                  className="h-3 rounded-lg"
                  style={{ width: `${50 + Math.random() * 40}%`, animationDelay: `${(row * cols + col) * 50}ms` }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Block / Section Skeleton ───
export const SkeletonBlock = ({ height = 200 }) => (
  <div className="glass-card p-6" style={{ height }}>
    <SkeletonBase className="h-4 w-40 rounded-lg mb-4" />
    <div className="space-y-3">
      <SkeletonBase className="h-3 w-full rounded-lg" />
      <SkeletonBase className="h-3 w-5/6 rounded-lg" />
      <SkeletonBase className="h-3 w-4/6 rounded-lg" />
      <SkeletonBase className="h-3 w-3/4 rounded-lg" />
    </div>
  </div>
);

// ─── Tab Bar Skeleton ───
export const SkeletonTabs = ({ count = 5 }) => (
  <div className="flex items-center gap-2 mb-6">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonBase key={i} className="h-10 rounded-xl" style={{ width: `${70 + Math.random() * 40}px` }} />
    ))}
  </div>
);

// ─── Filter Bar Skeleton ───
export const SkeletonFilterBar = () => (
  <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
    <SkeletonBase className="flex-1 min-w-[240px] h-12 rounded-2xl" />
    <div className="flex items-center gap-3">
      {[1,2,3,4].map(i => (
        <SkeletonBase key={i} className="h-10 w-32 rounded-2xl" />
      ))}
    </div>
  </div>
);

// ─── Settings Form Skeleton ───
export const SkeletonSettingsForm = () => (
  <div className="space-y-6">
    {/* Tabs */}
    <div className="flex items-center gap-1 border-b border-slate-200 pb-1">
      {[1,2,3,4,5].map(i => (
        <SkeletonBase key={i} className="h-9 w-24 rounded-t-xl" />
      ))}
    </div>
    {/* Form fields */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="space-y-2">
          <SkeletonBase className="h-3 w-24 rounded-lg" />
          <SkeletonBase className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
    {/* Button */}
    <SkeletonBase className="h-11 w-40 rounded-xl" />
  </div>
);

// ─── Stat Card Skeleton (like Reports page) ───
export const SkeletonStatCard = () => (
  <div className="rounded-xl border p-4 space-y-2 bg-slate-50 border-slate-100">
    <SkeletonBase className="h-3 w-20 rounded-lg" />
    <SkeletonBase className="h-7 w-14 rounded-lg" />
    <SkeletonBase className="h-2.5 w-16 rounded-lg" />
  </div>
);

// ═══════════════════════════════════════════
// PAGE-LEVEL SKELETONS
// ═══════════════════════════════════════════

// ─── Dashboard Skeleton ───
export const DashboardSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBase className="h-8 w-56 rounded-xl" />
        <SkeletonBase className="h-4 w-80 rounded-lg" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-10 w-64 rounded-xl" />
        <SkeletonBase className="h-10 w-36 rounded-xl" />
      </div>
    </div>

    {/* Primary KPI Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
    </div>

    {/* Secondary KPI Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {[1,2,3,4,5].map(i => <SkeletonKPI key={i} />)}
    </div>

    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <SkeletonChart height={400} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonBlock height={320} />
          <SkeletonBlock height={320} />
        </div>
      </div>
      <div className="space-y-8">
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <SkeletonBase className="h-5 w-36 rounded-lg" />
            <SkeletonBase className="h-3 w-16 rounded-lg" />
          </div>
          {[1,2,3,4,5].map(i => <SkeletonReview key={i} />)}
        </div>
      </div>
    </div>
  </div>
);

// ─── Reviews Skeleton ───
export const ReviewsSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBase className="h-8 w-48 rounded-xl" />
        <SkeletonBase className="h-4 w-64 rounded-lg" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-10 w-56 rounded-xl" />
        <SkeletonBase className="h-10 w-32 rounded-xl" />
      </div>
    </div>

    {/* Summary KPIs */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
    </div>

    {/* Tabs */}
    <SkeletonTabs count={8} />

    {/* Filter bar */}
    <div className="flex flex-wrap gap-3">
      {[1,2,3,4,5].map(i => (
        <SkeletonBase key={i} className="h-10 w-28 rounded-xl" />
      ))}
    </div>

    {/* Review cards */}
    <div className="space-y-4">
      {[1,2,3,4,5,6].map(i => <SkeletonReviewCard key={i} />)}
    </div>
  </div>
);

// ─── Tickets Skeleton ───
export const TicketsSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500 pb-20">
    {/* Header + Stats */}
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3 mb-2">
          <SkeletonBase className="w-10 h-10 rounded-xl" />
          <SkeletonBase className="h-8 w-52 rounded-xl" />
        </div>
        <SkeletonBase className="h-4 w-72 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:w-[60%]">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
            <SkeletonBase className="h-3 w-20 rounded-lg" />
            <SkeletonBase className="h-6 w-12 rounded-lg" />
          </div>
        ))}
      </div>
    </div>

    {/* Filter bar */}
    <SkeletonFilterBar />

    {/* Table */}
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            {["Issue / Review", "Dept", "Guest & Status", "SLA Progress", "Assignee"].map(h => (
              <th key={h} className="px-6 py-4">
                <SkeletonBase className="h-3 w-24 rounded-lg" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {[1,2,3,4,5,6,7].map(i => <SkeletonTicketRow key={i} />)}
        </tbody>
      </table>
    </div>
  </div>
);

// ─── Reports Skeleton ───
export const ReportsSkeleton = () => (
  <div className="max-w-[1600px] mx-auto pb-20 space-y-8 animate-in fade-in duration-500">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBase className="h-8 w-56 rounded-xl" />
        <SkeletonBase className="h-4 w-80 rounded-lg" />
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <SkeletonBase className="h-10 w-32 rounded-lg" />
        <SkeletonBase className="h-10 w-28 rounded-lg" />
      </div>
    </div>

    {/* KPIs */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
    </div>

    {/* Tabs */}
    <div className="flex items-center gap-1 border-b border-slate-200">
      {[1,2,3,4].map(i => (
        <SkeletonBase key={i} className="h-10 w-24 rounded-t-lg" />
      ))}
    </div>

    {/* Chart content */}
    <SkeletonTable rows={5} cols={7} />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SkeletonChart height={320} />
      <SkeletonChartSmall />
      <SkeletonChart height={320} />
    </div>
  </div>
);

// ─── Settings Skeleton ───
export const SettingsSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    {/* Header */}
    <div className="space-y-2">
      <SkeletonBase className="h-8 w-32 rounded-xl" />
      <SkeletonBase className="h-4 w-72 rounded-lg" />
    </div>

    <SkeletonSettingsForm />
  </div>
);

// ─── Analytics Skeleton ───
export const AnalyticsSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500 pb-20">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBase className="h-8 w-64 rounded-xl" />
        <SkeletonBase className="h-4 w-80 rounded-lg" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-10 w-36 rounded-xl" />
        <SkeletonBase className="h-10 w-36 rounded-xl" />
      </div>
    </div>

    {/* KPI Row */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="glass-card p-4 space-y-2 flex flex-col items-center">
          <SkeletonBase className="h-3 w-16 rounded-md" />
          <SkeletonBase className="h-6 w-12 rounded-md" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Rating Distribution Chart */}
      <SkeletonChart height={350} />

      {/* Platform Distribution Chart */}
      <SkeletonChartSmall />

      {/* Department Performance Table */}
      <div className="lg:col-span-2">
        <SkeletonTable rows={4} cols={5} />
      </div>
    </div>
  </div>
);
