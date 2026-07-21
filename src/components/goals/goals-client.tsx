"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, PlusCircle, Trash2 } from "lucide-react";
import {
  addGoalContribution,
  createGoal,
  deleteGoal,
  deleteGoalContribution,
  updateGoal,
} from "@/lib/actions/goals";
import type { ActionState } from "@/lib/actions/transactions";
import { CATEGORY_COLORS } from "@/lib/colors";
import { formatBRL } from "@/lib/money";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { ColorPicker } from "@/components/ui/color-picker";

type GoalItem = {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  targetDate: string | null;
  contributions: { id: string; amount: number; date: string }[];
};

const GOAL_ICONS = ["🎯", "✈️", "💍", "🏠", "🚗", "🛡️", "🎓", "💻", "🏖️", "👶", "🐶", "🎸"];

function GoalForm({
  editing,
  onDone,
}: {
  editing: GoalItem | null;
  onDone: () => void;
}) {
  const [icon, setIcon] = useState(editing?.icon ?? "🎯");
  const action = useMemo(
    () => (editing ? updateGoal.bind(null, editing.id) : createGoal),
    [editing]
  );
  const wrapped = async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok) onDone();
    return result;
  };
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    wrapped,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="goal-name">Nome</Label>
        <Input
          id="goal-name"
          name="name"
          placeholder="Ex: Reserva de emergência"
          defaultValue={editing?.name ?? ""}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="goal-target">Valor-alvo</Label>
          <MoneyInput
            id="goal-target"
            name="targetAmount"
            placeholder="0,00"
            defaultValue={editing ? String(editing.targetAmount) : undefined}
            required
          />
        </div>
        <div>
          <Label htmlFor="goal-date">Prazo — opcional</Label>
          <Input
            id="goal-date"
            name="targetDate"
            type="date"
            defaultValue={editing?.targetDate?.slice(0, 10) ?? ""}
          />
        </div>
      </div>
      <div>
        <Label>Ícone</Label>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ícone">
          {GOAL_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={icon === emoji}
              onClick={() => setIcon(emoji)}
              className={`size-9 rounded-lg text-lg flex items-center justify-center transition ${
                icon === emoji
                  ? "bg-accent-cyan/20 ring-1 ring-accent-cyan"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <input type="hidden" name="icon" value={icon} />
      </div>
      <div>
        <Label>Cor</Label>
        <ColorPicker
          name="color"
          presets={CATEGORY_COLORS}
          defaultValue={editing?.color}
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
        {pending ? "Salvando…" : editing ? "Salvar" : "Criar meta"}
      </button>
    </form>
  );
}

function ContributionForm({
  goal,
  onDone,
}: {
  goal: GoalItem;
  onDone: () => void;
}) {
  const bound = addGoalContribution.bind(null, goal.id);
  const wrapped = async (prev: ActionState, formData: FormData) => {
    const result = await bound(prev, formData);
    if (result.ok) onDone();
    return result;
  };
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    wrapped,
    {}
  );
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="contribution-amount">Valor do aporte (R$)</Label>
          <Input
            id="contribution-amount"
            name="amount"
            inputMode="decimal"
            placeholder="Use negativo para retirar (ex: -100)"
            autoFocus
            required
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
          {pending ? "Salvando…" : "Adicionar aporte"}
        </button>
      </form>

      {goal.contributions.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-2">
            Histórico
          </p>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {goal.contributions.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between text-sm bg-white/4 rounded-lg px-3 py-2 group"
              >
                <span className="text-muted text-xs">
                  {new Date(c.date).toLocaleDateString("pt-BR")}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={`tabular ${
                      c.amount < 0 ? "text-expense" : "text-income"
                    }`}
                  >
                    {c.amount >= 0 ? "+" : "−"}
                    {formatBRL(Math.abs(c.amount))}
                  </span>
                  <button
                    onClick={() =>
                      startTransition(() => {
                        deleteGoalContribution(c.id);
                      })
                    }
                    className="rounded p-1 text-muted hover:text-expense opacity-0 group-hover:opacity-100 transition"
                    aria-label="Excluir aporte"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function GoalsClient({ goals }: { goals: GoalItem[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GoalItem | null>(null);
  const [contributing, setContributing] = useState<GoalItem | null>(null);
  const [, startTransition] = useTransition();

  // mantém o modal de aportes sincronizado após revalidação
  const contributingFresh = contributing
    ? (goals.find((g) => g.id === contributing.id) ?? null)
    : null;

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-1.5"
        >
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {goals.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="🎯"
            title="Nenhuma meta ainda"
            description="Crie objetivos como viagem, casamento ou reserva de emergência."
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const saved = goal.contributions.reduce(
              (sum, c) => sum + c.amount,
              0
            );
            const percent = (saved / goal.targetAmount) * 100;
            const done = percent >= 100;
            const daysLeft = goal.targetDate
              ? Math.ceil(
                  (new Date(goal.targetDate).getTime() - Date.now()) / 86400000
                )
              : null;
            return (
              <div
                key={goal.id}
                className="glass glass-hover rounded-2xl p-5 group relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="size-11 rounded-xl flex items-center justify-center text-xl border border-white/10"
                    style={{ background: `${goal.color}26` }}
                    aria-hidden
                  >
                    {goal.icon}
                  </span>
                  <span className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                    <button
                      onClick={() => {
                        setEditing(goal);
                        setModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-white/10"
                      aria-label={`Editar ${goal.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Excluir a meta "${goal.name}"?`)) return;
                        startTransition(() => {
                          deleteGoal(goal.id);
                        });
                      }}
                      className="rounded-lg p-1.5 text-muted hover:text-expense hover:bg-expense/10"
                      aria-label={`Excluir ${goal.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
                <p className="font-medium truncate">{goal.name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {done
                    ? "Meta concluída! 🎉"
                    : daysLeft !== null
                      ? daysLeft >= 0
                        ? `${daysLeft} dias restantes`
                        : `prazo vencido há ${-daysLeft} dias`
                      : "sem prazo"}
                </p>
                <div className="mt-3">
                  <ProgressBar
                    percent={Math.min(percent, 100)}
                    color={done ? "var(--income)" : goal.color}
                  />
                  <div className="flex justify-between mt-1.5 text-xs">
                    <span className="tabular text-muted">
                      {formatBRL(saved)} de {formatBRL(goal.targetAmount)}
                    </span>
                    <span className="tabular font-semibold">
                      {Math.round(percent)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setContributing(goal)}
                  className="mt-4 w-full rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan py-2 text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:bg-accent-cyan/20 transition"
                >
                  <PlusCircle size={15} /> Aportar
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar meta" : "Nova meta"}
      >
        <GoalForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => setModalOpen(false)}
        />
      </Modal>

      <Modal
        open={contributingFresh !== null}
        onClose={() => setContributing(null)}
        title={
          contributingFresh
            ? `Aportes — ${contributingFresh.icon} ${contributingFresh.name}`
            : "Aportes"
        }
      >
        {contributingFresh && (
          <ContributionForm
            key={contributingFresh.id}
            goal={contributingFresh}
            onDone={() => {}}
          />
        )}
      </Modal>
    </>
  );
}
