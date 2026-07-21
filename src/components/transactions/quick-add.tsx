"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "./transaction-form";
import type { AccountDTO, CardDTO, CategoryDTO } from "@/lib/types";

/** Botão flutuante "+" fixo em todas as telas para lançar uma transação. */
export function QuickAdd({
  categories,
  accounts,
  cards,
}: {
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  cards: CardDTO[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Adicionar transação"
        className="fixed z-30 right-5 bottom-20 md:bottom-6 size-14 rounded-full btn-gradient text-white grid place-items-center shadow-xl active:scale-95 transition"
      >
        <Plus size={26} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova transação">
        <TransactionForm
          key={open ? "open" : "closed"}
          categories={categories}
          accounts={accounts}
          cards={cards}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
