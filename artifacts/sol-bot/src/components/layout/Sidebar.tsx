import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  List, 
  History, 
  Search, 
  Settings, 
  Menu,
  Wallet
} from "lucide-react";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { shortenAddress } from "@/lib/format";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/positions", label: "Positions", icon: List },
  { href: "/trades", label: "Trades", icon: History },
  { href: "/tokens", label: "Tokens", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { data: summary } = useGetDashboardSummary();

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-background">
        <div className="font-bold text-lg tracking-tight text-primary flex items-center gap-2">
          <span className="bg-primary text-black px-1.5 py-0.5 rounded-sm">SOL</span>
          BOT
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMobile}>
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={closeMobile} 
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 border-r bg-sidebar flex flex-col
        transition-transform duration-200 ease-in-out
        md:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b flex-shrink-0 flex items-center justify-between">
          <div className="font-bold text-2xl tracking-tight text-primary flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-1 rounded-sm">SOL</span>
            BOT
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}
                `}
                onClick={closeMobile}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t flex-shrink-0">
          <div className="flex items-center gap-3 bg-muted p-3 rounded-md">
            <div className="bg-background p-2 rounded-full border">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Wallet</span>
              {summary?.walletAddress ? (
                <span className="text-sm font-mono font-medium truncate" title={summary.walletAddress}>
                  {shortenAddress(summary.walletAddress, 6)}
                </span>
              ) : (
                <Link href="/settings" className="text-sm font-medium text-primary hover:underline">
                  Configure
                </Link>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
