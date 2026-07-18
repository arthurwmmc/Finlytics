"use client";

import { useMemo, useState, useTransition } from "react";
import { CreditCard, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import {
  deleteInstallmentGroup,
  deleteTransaction,
} from "@/lib/actions/transactions";
import { formatBRL } from "@/lib/money";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { TransactionForm } from "./transaction-form";
import type {
  AccountDTO,
  CardDTO,
  CategoryDTO,
  TransactionDTO,
} from "@/lib/types";

export function TransactionsClient({
  transactions,
  categories,
  accounts,
  cards,
}: {
  transactions: TransactionDTO[];
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  cards: CardDTO[];
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [, startTransition] = useTransition();

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const filtered = transactions.filter((tx) => {
    if (typeFilter && tx.type !== typeFilter) return false;
    if (categoryFilter && tx.categoryId !== categoryFilter) return false;
    if (paymentFilter) {
      const [kind, id] = paymentFilter.split(":");
      if (kind === "account" && tx.accountId !== id) return false;
      if (kind === "card" && tx.creditCardId !== id) return false;
    }
    if (
      query &&
      !tx.description.toLowerCase().includes(query.toLowerCase().trim())
    )
      return false;
    return true;
  });

  const totals = filtered.reduce(
    (acc, tx) => {
      if (tx.type === "INCOME") acc.income += tx.amount;
      else acc.expense += tx.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  function handleDelete(tx: TransactionDTO) {
    const isInstallment = tx.installmentGroupId && (tx.installmentTotal ?? 0) > 1;
    if (isInstallment) {
      const all = confirm(
        `"${tx.description}" faz parte de uma compra parcelada em ${tx.installmentTotal}x.\n\nOK = excluir TODAS as parcelas\nCancelar = não excluir nada`
      );
      if (!all) return;
      startTransition(() => {
        deleteInstallmentGroup(tx.installmentGroupId!);
      });
      return;
    }
    if (!confirm(`Excluir "${tx.description}"?`)) return;
    startTransition(() => {
      deleteTransaction(tx.id);
    });
  }

  return (
    <>
      {/* Filtros */}
      <GlassCard>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por descrição…"
              className="pl-10"
              aria-label="Buscar transações"
            />
          </div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-auto"
            aria-label="Filtrar por tipo"
          >
            <option value="">Tudo</option>
            <option value="INCOME">Receitas</option>
            <option value="EXPENSE">Despesas</option>
          </Select>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-auto"
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-auto"
            aria-label="Filtrar por conta ou cartão"
          >
            <option value="">Contas e cartões</option>
            {accounts.map((a) => (
              <option key={a.id} value={`account:${a.id}`}>
                {a.name}
              </option>
            ))}
            {cards.map((c) => (
              <option key={c.id} value={`card:${c.id}`}>
                💳 {c.name}
              </option>
            ))}
          </Select>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-1.5"
          >
            <Plus size={16} /> Nova
          </button>
        </div>
      </GlassCard>

      {/* Totais do filtro */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="glass rounded-full px-4 py-1.5">
          {filtered.length} transaç{filtered.length === 1 ? "ão" : "ões"}
        </span>
        <span className="glass rounded-full px-4 py-1.5 text-income tabular">
          +{formatBRL(totals.income)}
        </span>
        <span className="glass rounded-full px-4 py-1.5 text-expense tabular">
          −{formatBRL(totals.expense)}
        </span>
      </div>

      {/* Lista */}
      <GlassCard className="!p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon="🌠"
            title="Nenhuma transação encontrada"
            description="Ajuste os filtros ou lance uma nova transação."
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((tx) => {
              const category = categoryById.get(tx.categoryId);
              const paymentLabel = tx.creditCardId
                ? cardById.get(tx.creditCardId)?.name
                : tx.accountId
                  ? accountById.get(tx.accountId)?.name
                  : "—";
              return (
                <li
                  key={tx.id}
                  className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-white/4 transition group"
                >
                  <span
                    className="size-9 rounded-xl flex items-center justify-center text-base shrink-0 border border-white/10"
                    style={{ background: `${category?.color ?? "#8b93a7"}26` }}
                    aria-hidden
                  >
                    {category?.icon ?? "❓"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{tx.description}</p>
                    <p className="text-[11px] text-muted flex items-center gap-1.5 flex-wrap">
                      <span>
                        {new Date(tx.date).toLocaleDateString("pt-BR")}
                      </span>
                      · <span>{category?.name}</span> ·
                      <span className="inline-flex items-center gap-1">
                        {tx.creditCardId ? (
                          <CreditCard size={11} aria-label="cartão" />
                        ) : (
                          <Wallet size={11} aria-label="conta" />
                        )}
                        {paymentLabel}
                      </span>
                      {tx.recurringRuleId && (
                        <span className="rounded-full bg-accent-violet/15 text-accent-violet px-2 py-px text-[10px]">
                          recorrente
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`tabular text-sm font-semibold shrink-0 ${
                      tx.type === "INCOME" ? "text-income" : "text-expense"
                    }`}
                  >
                    {tx.type === "INCOME" ? "+" : "−"}
                    {formatBRL(tx.amount)}
                  </span>
                  <span className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                    <button
                      onClick={() => {
                        setEditing(tx);
                        setModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-white/10"
                      aria-label={`Editar ${tx.description}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(tx)}
                      className="rounded-lg p-1.5 text-muted hover:text-expense hover:bg-expense/10"
                      aria-label={`Excluir ${tx.description}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar transação" : "Nova transação"}
      >
        <TransactionForm
          key={editing?.id ?? "new"}
          categories={categories}
          accounts={accounts}
          cards={cards}
          editing={editing}
          onDone={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
