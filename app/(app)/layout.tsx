import { requireUser } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { InstallPrompt } from '@/components/pwa/install-prompt';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:pl-60">
        <Topbar
          user={{
            full_name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url,
            role: user.role,
          }}
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <InstallPrompt />
    </div>
  );
}
