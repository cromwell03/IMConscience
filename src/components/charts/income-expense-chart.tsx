"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { minorToNumber } from "@/lib/money";
import { CHART_COLORS } from "@/lib/chart-colors";

export interface TrendDatum {
  label: string;
  incomeMinor: string; // serialized bigint
  expensesMinor: string;
}

export function IncomeExpenseChart({ data, currencyCode = "PHP" }: { data: TrendDatum[]; currencyCode?: string }) {
  const chartData = data.map((d) => ({
    label: d.label,
    Income: minorToNumber(BigInt(d.incomeMinor), currencyCode),
    Expenses: minorToNumber(BigInt(d.expensesMinor), currencyCode),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          formatter={(value) => Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Income" fill={CHART_COLORS.positive} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="Expenses" fill={CHART_COLORS.negative} radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
