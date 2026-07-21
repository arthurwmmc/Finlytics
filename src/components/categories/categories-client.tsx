"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions/categories";
import type { ActionState } from "@/lib/actions/transactions";
import { CATEGORY_COLORS } from "@/lib/colors";
import { formatBRL } from "@/lib/money";
import { Modal } from "@/components/ui/modal";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { ColorPicker } from "@/components/ui/color-picker";

type CategoryItem = {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  monthlyBudget: number | null;
  transactionCount: number;
};

const SUGGESTED_ICONS = [
  "🍔", "🛒", "🏠", "🚗", "💊", "🎮", "📚", "📺", "🛍️", "✈️", "🐾", "📦",
  "💼", "💻", "📈", "🎁", "💰", "☕", "🍺", "💅", "🏋️", "🎬", "📱", "⚡",
];

function CategoryForm({
  editing,
  defaultType,
  onDone,
}: {
  editing: CategoryItem | null;
  defaultType: "INCOME" | "EXPENSE";
  onDone: () => void;
}) {
  const [type, setType] = useState<string>(editing?.type ?? defaultType);
  const [icon, setIcon] = useState(editing?.icon ?? "🏷️");

  const action = useMemo(
    () => (editing ? updateCategory.bind(null, editing.id) : createCategory),
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
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
        {(
          [
            ["EXPENSE", "Despesa", "border-expense/40 bg-expense/15 text-expense"],
            ["INCOME", "Receita", "border-income/40 bg-income/15 text-income"],
          ] as const
        ).map(([value, label, activeClass]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => setType(value)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              type === value
                ? activeClass
                : "border-white/10 bg-white/5 text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <div>
        <Label htmlFor="cat-name">Nome</Label>
        <Input
          id="cat-name"
          name="name"
          placeholder="Ex: Delivery"
          defaultValue={editing?.name ?? ""}
          required
        />
      </div>

      <div>
        <Label>Ícone</Label>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ícone">
          {SUGGESTED_ICONS.map((emoji) => (
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

      {type === "EXPENSE" && (
        <div>
          <Label htmlFor="cat-budget">Orçamento mensal — opcional</Label>
          <MoneyInput
            id="cat-budget"
            name="monthlyBudget"
            placeholder="Sem limite"
            defaultValue={
              editing?.monthlyBudget ? String(editing.monthlyBudget) : undefined
            }
          />
        </div>
      )}

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
        {pending ? "Salvando…" : editing ? "Salvar" : "Criar categoria"}
      </button>
    </form>
  );
}

function CategoryGrid({
  items,
  onEdit,
  onDelete,
}: {
  items: CategoryItem[];
  onEdit: (c: CategoryItem) => void;
  onDelete: (c: CategoryItem) => void;
}) {
  if (items.length === 0)
    return <EmptyState icon="🏷️" title="Nenhuma categoria aqui" />;
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map((category) => (
        <li
          key={category.id}
          className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/8 px-4 py-3 group"
        >
          <span
            className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0 border border-white/10"
            style={{ background: `${category.color}26` }}
            aria-hidden
          >
            {category.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate">{category.name}</p>
            <p className="text-[11px] text-muted">
              {category.transactionCount} transaç
              {category.transactionCount === 1 ? "ão" : "ões"}
              {category.monthlyBudget
                ? ` · orçamento ${formatBRL(category.monthlyBudget)}`
                : ""}
            </p>
          </div>
          <span className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
            <button
              onClick={() => onEdit(category)}
              className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-white/10"
              aria-label={`Editar ${category.name}`}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="rounded-lg p-1.5 text-muted hover:text-expense hover:bg-expense/10"
              aria-label={`Excluir ${category.name}`}
            >
              <Trash2 size={14} />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CategoriesClient({
  categories,
}: {
  categories: CategoryItem[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [defaultType, setDefaultType] = useState<"INCOME" | "EXPENSE">(
    "EXPENSE"
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const expenses = categories.filter((c) => c.type === "EXPENSE");
  const incomes = categories.filter((c) => c.type === "INCOME");

  function handleDelete(category: CategoryItem) {
    if (!confirm(`Excluir a categoria "${category.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.error) setError(result.error);
    });
  }

  function openNew(type: "INCOME" | "EXPENSE") {
    setEditing(null);
    setDefaultType(type);
    setModalOpen(true);
  }

  return (
    <>
      {error && (
        <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <GlassCard
        title={`Despesas (${expenses.length})`}
        action={
          <button
            onClick={() => openNew("EXPENSE")}
            className="text-xs text-accent-cyan hover:underline inline-flex items-center gap-1"
          >
            <Plus size={13} /> nova
          </button>
        }
      >
        <CategoryGrid
          items={expenses}
          onEdit={(c) => {
            setEditing(c);
            setModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      </GlassCard>

      <GlassCard
        title={`Receitas (${incomes.length})`}
        action={
          <button
            onClick={() => openNew("INCOME")}
            className="text-xs text-accent-cyan hover:underline inline-flex items-center gap-1"
          >
            <Plus size={13} /> nova
          </button>
        }
      >
        <CategoryGrid
          items={incomes}
          onEdit={(c) => {
            setEditing(c);
            setModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      </GlassCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar categoria" : "Nova categoria"}
      >
        <CategoryForm
          key={editing?.id ?? defaultType}
          editing={editing}
          defaultType={defaultType}
          onDone={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
