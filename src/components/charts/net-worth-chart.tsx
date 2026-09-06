"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { minorToNumber } from "@/lib/money";
import { CHART_COLORS } from "@/lib/chart-colors";

export interface NetWorthDatum {
  label: string;
  netWorthMinor: string;
}

export function NetWorthChart({ data, currencyCode = "PHP" }: { data: NetWorthDatum[]; currencyCode?: string }) {
  const chartData = data.map((d) => ({
    label: d.label,
    "Net Worth": minorToNumber(BigInt(d.netWorthMinor), currencyCode),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.positive} stopOpacity={0.35} />
            <stop offset="95%" stopColor={CHART_COLORS.positive} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          formatter={(value) => Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        />
        <Area type="monotone" dataKey="Net Worth" stroke={CHART_COLORS.positive} fill="url(#netWorthFill)" strokeWidth={2} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
