"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_GRID,
  CHART_TEXT,
  EXPENSE_COLOR,
  INCOME_COLOR,
} from "@/lib/colors";
import { formatBRLCompact } from "@/lib/money";
import { GlassTooltip } from "./chart-tooltip";

export function CashflowChart({
  data,
}: {
  data: { label: string; income: number; expense: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART_TEXT, fontSize: 11 }}
          tickFormatter={(v: number) => formatBRLCompact(v)}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip
          content={<GlassTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: CHART_TEXT, fontSize: 12 }}>{value}</span>
          )}
        />
        <Bar
          dataKey="income"
          name="Receitas"
          fill={INCOME_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
        <Bar
          dataKey="expense"
          name="Despesas"
          fill={EXPENSE_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
