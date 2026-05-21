import { useGetDashboardSummary, useGetBotStatus, useStartBot, useStopBot, useGetRecentActivity } from "@workspace/api-client-react";
import { formatUsd, formatCompactUsd, formatPct, cnPnl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Power, StopCircle, ArrowUpRight, ArrowDownRight, Clock, Target, Wallet, Search } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, refetch: refetchSummary } = useGetDashboardSummary({ query: { refetchInterval: 10000 } });
  const { data: status, refetch: refetchStatus } = useGetBotStatus({ query: { refetchInterval: 10000 } });
  const { data: activities } = useGetRecentActivity({ query: { refetchInterval: 10000 } });

  const startBot = useStartBot({
    mutation: {
      onSuccess: () => {
        refetchStatus();
        refetchSummary();
      }
    }
  });

  const stopBot = useStopBot({
    mutation: {
      onSuccess: () => {
        refetchStatus();
        refetchSummary();
      }
    }
  });

  const isRunning = status?.running;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Command center for Solana sniping.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm bg-muted px-3 py-1.5 rounded-md border">
            <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-primary animate-pulse" : "bg-destructive"}`} />
            <span className="font-medium font-mono uppercase">
              {isRunning ? "System Active" : "System Offline"}
            </span>
          </div>

          {!summary?.walletAddress ? (
            <Button asChild variant="outline">
              <Link href="/settings">Configure Wallet</Link>
            </Button>
          ) : isRunning ? (
            <Button 
              variant="destructive" 
              onClick={() => stopBot.mutate()}
              disabled={stopBot.isPending}
            >
              <StopCircle className="mr-2 h-4 w-4" /> Stop Bot
            </Button>
          ) : (
            <Button 
              onClick={() => startBot.mutate()}
              disabled={startBot.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Power className="mr-2 h-4 w-4" /> Start Bot
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Realized PnL</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${cnPnl(summary?.totalRealizedPnlUsd)}`}>
              {formatUsd(summary?.totalRealizedPnlUsd)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime profitability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Open Positions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {summary?.openPositions || 0}
            </div>
            <p className={`text-xs mt-1 font-mono ${cnPnl(summary?.totalUnrealizedPnlUsd)}`}>
              Unrealized: {formatUsd(summary?.totalUnrealizedPnlUsd)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Win Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatPct(summary?.winRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Based on {summary?.totalTrades || 0} total trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tokens Scanned</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {status?.tokensScanned || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Since last start</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities?.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 text-sm">
                  <div className="mt-0.5 bg-muted p-1.5 rounded-full">
                    {activity.type.includes('buy') ? <ArrowDownRight className="h-3 w-3 text-primary" /> : 
                     activity.type.includes('sell') ? <ArrowUpRight className="h-3 w-3 text-destructive" /> : 
                     <Activity className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium leading-none">
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{new Date(activity.createdAt).toLocaleTimeString()}</span>
                      {activity.tokenSymbol && (
                        <>
                          <span>•</span>
                          <span className="text-foreground">{activity.tokenSymbol}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!activities || activities.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <Clock className="mx-auto h-8 w-8 opacity-20 mb-2" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
