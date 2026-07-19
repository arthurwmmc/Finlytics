import { requireUser } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
          Ajustes
        </h1>
        <p className="text-sm text-muted mt-0.5">
          Seu perfil e a segurança da conta.
        </p>
      </div>
      <SettingsClient name={user.name} email={user.email} />
    </div>
  );
}
