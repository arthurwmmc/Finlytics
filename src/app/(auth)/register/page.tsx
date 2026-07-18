"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/field";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    register,
    {}
  );

  return (
    <div className="glass rounded-3xl p-8">
      <h2 className="text-xl font-semibold mb-6">Criar conta</h2>
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" placeholder="Seu nome" required />
        </div>
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
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo de 6 caracteres"
            required
            minLength={6}
          />
        </div>
        <div>
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a senha"
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
          {pending ? "Criando…" : "Criar conta"}
        </button>
      </form>
      <p className="text-sm text-muted mt-6 text-center">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent-cyan hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
