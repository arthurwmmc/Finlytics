import { requireUser } from "@/lib/auth";
import { getAccountsWithBalances } from "@/lib/finance";
import { AccountsClient } from "@/components/accounts/accounts-client";

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await getAccountsWithBalances(user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
          Contas
        </h1>
        <p className="text-sm text-muted mt-0.5">
          Carteiras, contas bancárias e investimentos.
        </p>
      </div>
      <AccountsClient
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          color: a.color,
          initialBalance: a.initialBalance,
          balance: a.balance,
        }))}
      />
    </div>
  );
}
