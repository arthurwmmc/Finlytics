"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_GRID, CHART_TEXT } from "@/lib/colors";
import { formatBRLCompact } from "@/lib/money";
import { GlassTooltip } from "./chart-tooltip";

const LINE = "#0899db";

export function BalanceAreaChart({
  data,
}: {
  data: { label: string; balance: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={LINE} stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Tooltip content={<GlassTooltip />} />
        <Area
          type="monotone"
          dataKey="balance"
          name="Saldo"
          stroke={LINE}
          strokeWidth={2}
          fill="url(#balanceFill)"
          dot={{ r: 3, fill: LINE, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
