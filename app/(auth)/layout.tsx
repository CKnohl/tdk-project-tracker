export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4 dark:from-slate-950 dark:to-slate-900">
      {children}
    </div>
  );
}
