"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <div className="glass rounded-3xl p-8">
      <h2 className="text-xl font-semibold mb-6">Entrar</h2>
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
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
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="text-sm text-muted mt-6 text-center">
        Ainda não tem conta?{" "}
        <Link href="/register" className="text-accent-cyan hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
