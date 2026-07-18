import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

export function Header({ userName }: { userName: string }) {
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="flex items-center justify-end gap-3 mb-6">
      <div className="flex items-center gap-3 glass rounded-full pl-4 pr-1.5 py-1.5">
        <span className="text-sm text-foreground/90 max-w-40 truncate">
          {userName}
        </span>
        <span
          className="flex items-center justify-center size-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-xs font-bold text-white"
          aria-hidden
        >
          {initials}
        </span>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="glass glass-hover rounded-full p-2.5 text-muted hover:text-foreground"
          title="Sair"
          aria-label="Sair da conta"
        >
          <LogOut size={16} />
        </button>
      </form>
    </header>
  );
}
