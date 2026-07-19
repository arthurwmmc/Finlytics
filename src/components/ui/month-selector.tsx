import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { currentYM, shiftYM, ymLabel } from "@/lib/finance";

/** Navegação de mês via query param `m` (server component, sem JS). */
export function MonthSelector({
  ym,
  basePath,
}: {
  ym: string;
  basePath: string;
}) {
  const prev = shiftYM(ym, -1);
  const next = shiftYM(ym, 1);
  const isCurrent = ym === currentYM();

  return (
    <div className="flex items-center gap-1 glass rounded-full px-1.5 py-1">
      <Link
        href={`${basePath}?m=${prev}`}
        className="rounded-full p-1.5 text-muted hover:text-foreground hover:bg-white/10 transition"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={16} />
      </Link>
      <span className="text-sm font-medium min-w-36 text-center">
        {ymLabel(ym)}
      </span>
      <Link
        href={`${basePath}?m=${next}`}
        className="rounded-full p-1.5 text-muted hover:text-foreground hover:bg-white/10 transition"
        aria-label="Próximo mês"
      >
        <ChevronRight size={16} />
      </Link>
      {!isCurrent && (
        <Link
          href={basePath}
          className="text-xs text-accent-cyan hover:underline px-2"
        >
          hoje
        </Link>
      )}
    </div>
  );
}
