"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { minorToNumber } from "@/lib/money";
import { CHART_COLORS } from "@/lib/chart-colors";

export interface CategoryDatum {
  categoryName: string;
  amountMinor: string;
}

export function CategoryPieChart({ data, currencyCode = "PHP" }: { data: CategoryDatum[]; currencyCode?: string }) {
  const chartData = data
    .map((d) => ({ name: d.categoryName, value: minorToNumber(BigInt(d.amountMinor), currencyCode) }))
    .filter((d) => d.value > 0)
    .slice(0, 8);

  if (chartData.length === 0) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted">No expenses in this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} isAnimationActive={false}>
          {chartData.map((entry, i) => (
            <Cell key={entry.name} fill={CHART_COLORS.categorical[i % CHART_COLORS.categorical.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          formatter={(value) => Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
