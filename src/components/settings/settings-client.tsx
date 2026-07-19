"use client";

import { useActionState, useRef, useState } from "react";
import { changePassword, updateProfile } from "@/lib/actions/profile";
import type { ActionState } from "@/lib/actions/transactions";
import { GlassCard } from "@/components/ui/glass-card";
import { Input, Label } from "@/components/ui/field";

function Feedback({ state, success }: { state: ActionState; success: string }) {
  if (state.error)
    return (
      <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="text-sm text-income bg-income/10 border border-income/20 rounded-xl px-4 py-2.5">
        {success}
      </p>
    );
  return null;
}

export function SettingsClient({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState<
    ActionState,
    FormData
  >(updateProfile, {});

  const passwordFormRef = useRef<HTMLFormElement>(null);
  const [passwordState, setPasswordState] = useState<ActionState>({});
  const [passwordPending, setPasswordPending] = useState(false);

  async function handlePassword(formData: FormData) {
    setPasswordPending(true);
    const result = await changePassword({}, formData);
    setPasswordState(result);
    setPasswordPending(false);
    if (result.ok) passwordFormRef.current?.reset();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
      <GlassCard title="Perfil">
        <form action={profileAction} className="space-y-4">
          <div>
            <Label htmlFor="profile-name">Nome</Label>
            <Input id="profile-name" name="name" defaultValue={name} required />
          </div>
          <div>
            <Label htmlFor="profile-email">E-mail</Label>
            <Input
              id="profile-email"
              name="email"
              type="email"
              defaultValue={email}
              required
            />
          </div>
          <Feedback state={profileState} success="Perfil atualizado!" />
          <button
            type="submit"
            disabled={profilePending}
            className="btn-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {profilePending ? "Salvando…" : "Salvar perfil"}
          </button>
        </form>
      </GlassCard>

      <GlassCard title="Trocar senha">
        <form ref={passwordFormRef} action={handlePassword} className="space-y-4">
          <div>
            <Label htmlFor="pw-current">Senha atual</Label>
            <Input
              id="pw-current"
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <Label htmlFor="pw-new">Nova senha</Label>
            <Input
              id="pw-new"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="Mínimo de 6 caracteres"
              required
            />
          </div>
          <div>
            <Label htmlFor="pw-confirm">Confirmar nova senha</Label>
            <Input
              id="pw-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <Feedback state={passwordState} success="Senha alterada!" />
          <button
            type="submit"
            disabled={passwordPending}
            className="btn-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {passwordPending ? "Alterando…" : "Alterar senha"}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
