"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { formatBRL } from "@/lib/money";
import { GlassTooltip } from "./chart-tooltip";

type Slice = {
  name: string;
  color: string;
  icon: string;
  total: number;
};

/**
 * Donut de despesas por categoria. Mostra no máximo 6 fatias; o resto vira
 * "Outras". A legenda ao lado carrega nome + valor (identidade nunca só na cor).
 */
export function CategoryDonut({ data }: { data: Slice[] }) {
  const MAX = 6;
  const top = data.slice(0, MAX);
  const rest = data.slice(MAX);
  const slices: Slice[] = [...top];
  if (rest.length > 0) {
    slices.push({
      name: "Outras",
      color: "#8b93a7",
      icon: "📦",
      total: rest.reduce((sum, s) => sum + s.total, 0),
    });
  }
  const total = data.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-44 h-44 shrink-0">
        <PieChart width={176} height={176}>
          <Pie
              data={slices}
              dataKey="total"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              strokeWidth={0}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
          </Pie>
          <Tooltip content={<GlassTooltip />} />
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-muted uppercase tracking-wider">
            Total
          </span>
          <span className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold">
            {formatBRL(total)}
          </span>
        </div>
      </div>
      <ul className="flex-1 w-full min-w-0 space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2.5">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ background: slice.color }}
              aria-hidden
            />
            <span className="text-foreground/85 truncate min-w-0 flex-1">
              {slice.icon} {slice.name}
            </span>
            <span className="ml-auto tabular text-muted shrink-0">
              {formatBRL(slice.total)}
            </span>
            <span className="tabular text-xs text-muted/70 w-8 text-right shrink-0">
              {total > 0 ? Math.round((slice.total / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
