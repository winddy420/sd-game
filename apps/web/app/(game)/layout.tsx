import { TopBar } from '@/components/game/top-bar';
import { Toaster } from '@/components/game/toaster';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <Toaster />
    </div>
  );
}
