export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-gradient">
            Finlytics
          </h1>
          <p className="text-muted mt-2 text-sm">
            Inteligência para as suas finanças.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
