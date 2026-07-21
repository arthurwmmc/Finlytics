"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { BadgeCheck, CreditCard, HandCoins, Pencil, Plus, Trash2 } from "lucide-react";
import { createCard, deleteCard, updateCard } from "@/lib/actions/cards";
import { payInvoice, type ActionState } from "@/lib/actions/transactions";
import { CARD_COLORS } from "@/lib/colors";
import { formatBRL } from "@/lib/money";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input, Label, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { ColorPicker } from "@/components/ui/color-picker";
import type { AccountDTO, CardDTO } from "@/lib/types";

export type InvoiceData = {
  card: CardDTO;
  total: number;
  paid: number;
  used: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  transactions: {
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
  }[];
};

const BRANDS = ["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OUTRO"];

function CardForm({
  editing,
  onDone,
}: {
  editing: CardDTO | null;
  onDone: () => void;
}) {
  const action = useMemo(
    () => (editing ? updateCard.bind(null, editing.id) : createCard),
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
        <Label htmlFor="card-name">Nome</Label>
        <Input
          id="card-name"
          name="name"
          placeholder="Ex: Nubank Ultravioleta"
          defaultValue={editing?.name ?? ""}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="card-brand">Bandeira</Label>
          <Select
            id="card-brand"
            name="brand"
            defaultValue={editing?.brand ?? "VISA"}
          >
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="card-limit">Limite</Label>
          <MoneyInput
            id="card-limit"
            name="limit"
            placeholder="0,00"
            defaultValue={editing ? String(editing.limit) : undefined}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="card-closing">Dia do fechamento</Label>
          <Input
            id="card-closing"
            name="closingDay"
            type="number"
            min={1}
            max={28}
            defaultValue={editing?.closingDay ?? ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="card-due">Dia do vencimento</Label>
          <Input
            id="card-due"
            name="dueDay"
            type="number"
            min={1}
            max={28}
            defaultValue={editing?.dueDay ?? ""}
            required
          />
        </div>
      </div>
      <div>
        <Label>Cor</Label>
        <ColorPicker
          name="color"
          presets={CARD_COLORS}
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
        {pending ? "Salvando…" : editing ? "Salvar" : "Adicionar cartão"}
      </button>
    </form>
  );
}

function PayInvoiceForm({
  invoice,
  accounts,
  onDone,
}: {
  invoice: InvoiceData;
  accounts: AccountDTO[];
  onDone: () => void;
}) {
  const wrapped = async (prev: ActionState, formData: FormData) => {
    const result = await payInvoice(prev, formData);
    if (result.ok) onDone();
    return result;
  };
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    wrapped,
    {}
  );
  const remaining = Math.max(0, invoice.total - invoice.paid);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="creditCardId" value={invoice.card.id} />
      <p className="text-sm text-muted">
        Fatura de{" "}
        <span className="text-foreground font-medium">{invoice.card.name}</span>{" "}
        · vence {new Date(invoice.dueDate).toLocaleDateString("pt-BR")}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="pay-amount">Valor</Label>
          <MoneyInput
            id="pay-amount"
            name="amount"
            defaultValue={String(remaining)}
            required
          />
        </div>
        <div>
          <Label htmlFor="pay-date">Data</Label>
          <Input
            id="pay-date"
            name="date"
            type="date"
            defaultValue={todayStr}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="pay-account">Debitar da conta</Label>
        <Select id="pay-account" name="accountId" required defaultValue={accounts[0]?.id ?? ""}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      {state.error && (
        <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || accounts.length === 0}
        className="btn-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Registrando…" : "Registrar pagamento"}
      </button>
      {accounts.length === 0 && (
        <p className="text-[11px] text-muted text-center">
          Cadastre uma conta primeiro para pagar a fatura.
        </p>
      )}
    </form>
  );
}

export function CardsClient({
  invoices,
  accounts,
}: {
  invoices: InvoiceData[];
  accounts: AccountDTO[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CardDTO | null>(null);
  const [paying, setPaying] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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
          <Plus size={16} /> Novo cartão
        </button>
      </div>

      {error && (
        <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      {invoices.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="💳"
            title="Nenhum cartão cadastrado"
            description="Adicione seus cartões para acompanhar faturas e parcelamentos."
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {invoices.map((invoice) => {
            const { card, total, paid, used, dueDate, periodStart, periodEnd, transactions } = invoice;
            const usedPercent = card.limit > 0 ? (used / card.limit) * 100 : 0;
            const isPaid = total > 0 && paid >= total;
            return (
              <GlassCard key={card.id} className="space-y-4">
                {/* topo estilo cartão físico */}
                <div
                  className="rounded-2xl p-5 text-white relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${card.color}, ${card.color}88)`,
                  }}
                >
                  <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-xl" aria-hidden />
                  <div className="flex items-start justify-between relative">
                    <div>
                      <p className="text-sm/tight opacity-85">{card.brand}</p>
                      <p className="text-lg font-semibold">{card.name}</p>
                    </div>
                    <span className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditing(card);
                          setModalOpen(true);
                        }}
                        className="rounded-lg p-1.5 bg-white/15 hover:bg-white/25 transition"
                        aria-label={`Editar ${card.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`Excluir o cartão "${card.name}"?`)) return;
                          setError(null);
                          startTransition(async () => {
                            const result = await deleteCard(card.id);
                            if (result.error) setError(result.error);
                          });
                        }}
                        className="rounded-lg p-1.5 bg-white/15 hover:bg-white/25 transition"
                        aria-label={`Excluir ${card.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                  <div className="mt-6 flex items-end justify-between relative">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider opacity-75">
                        Fatura do período
                      </p>
                      <p className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tabular">
                        {formatBRL(total)}
                      </p>
                      {isPaid && (
                        <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium">
                          <BadgeCheck size={12} aria-hidden /> Fatura paga
                        </span>
                      )}
                      {!isPaid && paid > 0 && (
                        <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium tabular">
                          {formatBRL(paid)} pagos
                        </span>
                      )}
                    </div>
                    <CreditCard size={26} className="opacity-70" aria-hidden />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-muted mb-1.5">
                    <span>
                      Limite comprometido: {formatBRL(used)} de{" "}
                      {formatBRL(card.limit)}
                    </span>
                    <span className="tabular">{Math.round(usedPercent)}%</span>
                  </div>
                  <ProgressBar percent={usedPercent} color={card.color} />
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-muted">
                    Período{" "}
                    {new Date(periodStart).toLocaleDateString("pt-BR")} –{" "}
                    {new Date(
                      new Date(periodEnd).getTime() - 86400000
                    ).toLocaleDateString("pt-BR")}{" "}
                    · vence em {new Date(dueDate).toLocaleDateString("pt-BR")}
                  </p>
                  {!isPaid && total > 0 && (
                    <button
                      onClick={() => setPaying(invoice)}
                      className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan px-3.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-accent-cyan/20 transition"
                    >
                      <HandCoins size={14} /> Pagar fatura
                    </button>
                  )}
                </div>

                {transactions.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">
                    Nenhum lançamento nesta fatura. ✨
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5 -mx-2">
                    {transactions.map((tx) => (
                      <li key={tx.id} className="flex items-center gap-3 px-2 py-2.5">
                        <span
                          className="size-8 rounded-lg flex items-center justify-center text-sm shrink-0 border border-white/10"
                          style={{ background: `${tx.categoryColor}26` }}
                          aria-hidden
                        >
                          {tx.categoryIcon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{tx.description}</p>
                          <p className="text-[11px] text-muted">
                            {new Date(tx.date).toLocaleDateString("pt-BR")} ·{" "}
                            {tx.categoryName}
                          </p>
                        </div>
                        <span
                          className={`tabular text-sm font-semibold ${
                            tx.type === "INCOME" ? "text-income" : ""
                          }`}
                        >
                          {tx.type === "INCOME" ? "+" : ""}
                          {formatBRL(tx.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar cartão" : "Novo cartão"}
      >
        <CardForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => setModalOpen(false)}
        />
      </Modal>

      <Modal
        open={paying !== null}
        onClose={() => setPaying(null)}
        title="Pagar fatura"
      >
        {paying && (
          <PayInvoiceForm
            key={paying.card.id}
            invoice={paying}
            accounts={accounts}
            onDone={() => setPaying(null)}
          />
        )}
      </Modal>
    </>
  );
}
