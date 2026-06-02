"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ParticleBackground } from "@/components/particle-background";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full overflow-hidden w-full relative">
      <ParticleBackground />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden w-full bg-transparent">
        <Header />
        <main className="flex-1 overflow-y-auto bg-transparent p-6 relative z-10">
          <div className="mx-auto max-w-[1400px] w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
