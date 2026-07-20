"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  MoreHorizontal,
  PiggyBank,
  Repeat,
  Settings,
  Tags,
  Target,
  Wallet,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/cards", label: "Cartões", icon: CreditCard },
  { href: "/budget", label: "Orçamento", icon: PiggyBank },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/recurring", label: "Recorrentes", icon: Repeat },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

const MOBILE_MAIN = NAV_ITEMS.slice(0, 5);
const MOBILE_MORE = NAV_ITEMS.slice(5);

export function Sidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop: sidebar de vidro fixa */}
      <aside className="hidden md:flex flex-col glass rounded-3xl m-4 mr-0 p-4 w-56 shrink-0 sticky top-4 h-[calc(100vh-2rem)]">
        <Link href="/" className="px-3 pt-1 pb-5 block">
          <span className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-gradient">
            Finlytics
          </span>
        </Link>
        <nav
          className="flex flex-col gap-1 overflow-y-auto"
          aria-label="Navegação principal"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive(href)
                  ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-foreground border border-white/10 shadow-[0_0_16px_rgba(34,211,238,0.12)]"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon size={17} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto px-3 pt-3 text-[10px] text-muted/60">
          Feito com Next.js · dados locais
        </p>
      </aside>

      {/* Mobile: bottom nav com menu "Mais" */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
          aria-hidden
        />
      )}
      {moreOpen && (
        <div className="md:hidden fixed bottom-16 inset-x-3 z-50 glass rounded-2xl p-3">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs text-muted uppercase tracking-wider">
              Mais páginas
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="rounded-lg p-1 text-muted hover:text-foreground"
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MOBILE_MORE.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs transition ${
                  isActive(href)
                    ? "bg-accent-cyan/15 text-accent-cyan"
                    : "bg-white/5 text-muted hover:text-foreground"
                }`}
              >
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/10 flex justify-around px-1 py-1.5"
        aria-label="Navegação principal"
      >
        {MOBILE_MAIN.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMoreOpen(false)}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] ${
              isActive(href) && !moreOpen ? "text-accent-cyan" : "text-muted"
            }`}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        ))}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] ${
            moreOpen || MOBILE_MORE.some(({ href }) => isActive(href))
              ? "text-accent-cyan"
              : "text-muted"
          }`}
          aria-expanded={moreOpen}
          aria-label="Mais páginas"
        >
          <MoreHorizontal size={18} aria-hidden />
          Mais
        </button>
      </nav>
    </>
  );
}
