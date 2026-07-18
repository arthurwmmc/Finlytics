import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { materializePendingRecurring } from "@/lib/recurring";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // lança recorrências pendentes até o mês atual
  await materializePendingRecurring(user.id);

  return (
    <div className="flex flex-1 max-w-[1600px] w-full mx-auto">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 md:p-6 pb-24 md:pb-6">
        <Header userName={user.name} />
        {children}
      </main>
    </div>
  );
}
