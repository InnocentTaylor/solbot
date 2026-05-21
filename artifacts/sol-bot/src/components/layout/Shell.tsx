import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useDarkMode } from "@/hooks/use-dark-mode";

export function Shell({ children }: { children: ReactNode }) {
  useDarkMode();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto max-w-full">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
