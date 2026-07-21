"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { setCategoryBudget } from "@/lib/actions/categories";
import type { ActionState } from "@/lib/actions/transactions";
import { formatBRL } from "@/lib/money";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";

type BudgetItem = {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthlyBudget: number | null;
  spent: number;
};

function BudgetForm({
  item,
  onDone,
}: {
  item: BudgetItem;
  onDone: () => void;
}) {
  const bound = setCategoryBudget.bind(null, item.id);
  const wrapped = async (prev: ActionState, formData: FormData) => {
    const result = await bound(prev, formData);
    if (result.ok) onDone();
    return result;
  };
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    wrapped,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted">
        {item.icon} <span className="text-foreground">{item.name}</span>
      </p>
      <div>
        <Label htmlFor="budget-value">Limite mensal</Label>
        <MoneyInput
          id="budget-value"
          name="monthlyBudget"
          placeholder="Deixe vazio para remover o limite"
          defaultValue={
            item.monthlyBudget ? String(item.monthlyBudget) : undefined
          }
          autoFocus
        />
      </div>
      {state.error && (
        <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar limite"}
      </button>
    </form>
  );
}

export function BudgetClient({ items }: { items: BudgetItem[] }) {
  const [editing, setEditing] = useState<BudgetItem | null>(null);

  const withBudget = items.filter((i) => i.monthlyBudget);
  const withoutBudget = items.filter((i) => !i.monthlyBudget);

  const totalBudget = withBudget.reduce(
    (sum, i) => sum + (i.monthlyBudget ?? 0),
    0
  );
  const totalSpent = withBudget.reduce((sum, i) => sum + i.spent, 0);
  const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <>
      {withBudget.length > 0 && (
        <GlassCard title="Visão geral">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted">
              {formatBRL(totalSpent)} gastos de {formatBRL(totalBudget)}{" "}
              orçados
            </span>
            <span
              className={`tabular font-semibold ${
                totalPercent > 100 ? "text-expense" : ""
              }`}
            >
              {Math.round(totalPercent)}%
            </span>
          </div>
          <ProgressBar percent={totalPercent} />
        </GlassCard>
      )}

      <GlassCard title={`Com orçamento (${withBudget.length})`}>
        {withBudget.length === 0 ? (
          <EmptyState
            icon="🛰️"
            title="Nenhum limite definido ainda"
            description="Defina um limite nas categorias abaixo."
          />
        ) : (
          <ul className="space-y-4">
            {withBudget.map((item) => {
              const percent = (item.spent / item.monthlyBudget!) * 100;
              const remaining = item.monthlyBudget! - item.spent;
              return (
                <li key={item.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                    <span className="truncate">
                      {item.icon} {item.name}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span
                        className={`tabular text-xs ${
                          percent > 100
                            ? "text-expense font-semibold"
                            : "text-muted"
                        }`}
                      >
                        {formatBRL(item.spent)} /{" "}
                        {formatBRL(item.monthlyBudget!)} ·{" "}
                        {Math.round(percent)}%
                      </span>
                      <button
                        onClick={() => setEditing(item)}
                        className="rounded-lg p-1 text-muted hover:text-foreground hover:bg-white/10"
                        aria-label={`Editar limite de ${item.name}`}
                      >
                        <Pencil size={13} />
                      </button>
                    </span>
                  </div>
                  <ProgressBar percent={percent} color={item.color} />
                  <p
                    className={`text-[11px] mt-1 ${
                      remaining < 0 ? "text-expense" : "text-muted"
                    }`}
                  >
                    {remaining >= 0
                      ? `${formatBRL(remaining)} disponíveis`
                      : `${formatBRL(-remaining)} acima do limite`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>

      <GlassCard title={`Sem orçamento (${withoutBudget.length})`}>
        {withoutBudget.length === 0 ? (
          <p className="text-sm text-muted text-center py-2">
            Todas as categorias têm limite. 🚀
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {withoutBudget.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setEditing(item)}
                  className="w-full flex items-center gap-3 rounded-xl bg-white/4 border border-white/8 px-4 py-3 hover:border-accent-cyan/40 transition text-left"
                >
                  <span
                    className="size-8 rounded-lg flex items-center justify-center text-base shrink-0 border border-white/10"
                    style={{ background: `${item.color}26` }}
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm truncate">{item.name}</span>
                    <span className="block text-[11px] text-muted tabular">
                      {formatBRL(item.spent)} neste mês
                    </span>
                  </span>
                  <span className="text-xs text-accent-cyan shrink-0">
                    definir
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Orçamento da categoria"
      >
        {editing && (
          <BudgetForm
            key={editing.id}
            item={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}
