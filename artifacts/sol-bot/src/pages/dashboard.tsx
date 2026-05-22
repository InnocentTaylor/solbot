import { useState, useEffect } from "react";
import { useGetDashboardSummary, useGetBotStatus, useStartBot, useStopBot, useGetRecentActivity, useListTrades, useGetDetailedHealth } from "@workspace/api-client-react";
import { formatUsd, formatCompactUsd, formatPct, cnPnl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Power, StopCircle, ArrowUpRight, ArrowDownRight, Clock, Target, Wallet, Search, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

function RpcBadge({ provider, status, latencyMs }: { provider: string; status: string; latencyMs: number | null }) {
  if (status === "down") return <Badge variant="destructive" className="font-mono text-xs">RPC DOWN</Badge>;
  if (status === "degraded") return <Badge variant="outline" className="font-mono text-xs text-yellow-400 border-yellow-400">RPC SLOW {latencyMs}ms</Badge>;
  return <Badge variant="outline" className="font-mono text-xs text-primary border-primary">{provider.toUpperCase()} {latencyMs}ms</Badge>;
}

export default function Dashboard() {
  const { data: summary, refetch: refetchSummary } = useGetDashboardSummary({ query: { refetchInterval: 10000 } });
  const { data: status, refetch: refetchStatus } = useGetBotStatus({ query: { refetchInterval: 10000 } });
  const { data: activities } = useGetRecentActivity({ query: { refetchInterval: 10000 } });
  const { data: recentTrades } = useListTrades({ limit: 5, offset: 0 }, { query: { refetchInterval: 15000 } });
  const { data: health } = useGetDetailedHealth({ query: { refetchInterval: 30000 } });

  const startBot = useStartBot({
    mutation: {
      onSuccess: () => { refetchStatus(); refetchSummary(); }
    }
  });

  const stopBot = useStopBot({
    mutation: {
      onSuccess: () => { refetchStatus(); refetchSummary(); }
    }
  });

  const isRunning = status?.running;
  const isStale = health?.bot?.isStale;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Command center for Solana sniping.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {health?.rpc && (
            <RpcBadge provider={health.rpc.provider} status={health.rpc.status} latencyMs={health.rpc.latencyMs} />
          )}

          {isStale && (
            <Badge variant="outline" className="font-mono text-xs text-yellow-400 border-yellow-400">
              <AlertTriangle className="h-3 w-3 mr-1" /> SCAN STALE
            </Badge>
          )}

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
              data-testid="button-stop-bot"
            >
              <StopCircle className="mr-2 h-4 w-4" /> Stop Bot
            </Button>
          ) : (
            <Button
              onClick={() => startBot.mutate()}
              disabled={startBot.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-start-bot"
            >
              <Power className="mr-2 h-4 w-4" /> Start Bot
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-realized-pnl">
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

        <Card data-testid="card-open-positions">
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

        <Card data-testid="card-win-rate">
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

        <Card data-testid="card-tokens-scanned">
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
        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities?.slice(0, 6).map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 text-sm" data-testid={`activity-item-${activity.id}`}>
                  <div className="mt-0.5 bg-muted p-1.5 rounded-full shrink-0">
                    {activity.type.includes("buy") ? <ArrowDownRight className="h-3 w-3 text-primary" /> :
                     activity.type.includes("sell") ? <ArrowUpRight className="h-3 w-3 text-destructive" /> :
                     <Activity className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="font-medium leading-none truncate">{activity.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{new Date(activity.createdAt).toLocaleTimeString()}</span>
                      {activity.tokenSymbol && (
                        <><span>•</span><span className="text-foreground">{activity.tokenSymbol}</span></>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Trades</CardTitle>
            <Link href="/trades" className="text-xs text-muted-foreground hover:text-primary font-mono">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTrades?.slice(0, 5).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between text-sm" data-testid={`trade-row-${trade.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-8 rounded-full ${trade.type === "buy" ? "bg-primary" : "bg-destructive"}`} />
                    <div>
                      <p className="font-medium font-mono">{trade.tokenSymbol}</p>
                      <p className="text-xs text-muted-foreground font-mono uppercase">{trade.type} · {trade.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium">{formatUsd(trade.amountUsd)}</p>
                    {trade.realizedPnlUsd !== null && (
                      <p className={`text-xs font-mono ${cnPnl(trade.realizedPnlUsd)}`}>
                        {trade.realizedPnlUsd >= 0 ? "+" : ""}{formatUsd(trade.realizedPnlUsd)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {(!recentTrades || recentTrades.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <Activity className="mx-auto h-8 w-8 opacity-20 mb-2" />
                  <p>No trades yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {health.rpc.status === "down" ? <WifiOff className="h-4 w-4 text-destructive" /> : <Wifi className="h-4 w-4 text-primary" />}
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
              <div>
                <p className="text-muted-foreground uppercase text-xs tracking-wider mb-1">RPC Provider</p>
                <p className={health.rpc.status === "down" ? "text-destructive" : "text-primary"}>
                  {health.rpc.provider.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase text-xs tracking-wider mb-1">RPC Latency</p>
                <p className={health.rpc.latencyMs && health.rpc.latencyMs > 1000 ? "text-yellow-400" : "text-foreground"}>
                  {health.rpc.latencyMs ? `${health.rpc.latencyMs}ms` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase text-xs tracking-wider mb-1">Uptime</p>
                <p>{health.bot.uptime ? `${Math.floor(health.bot.uptime / 3600)}h ${Math.floor((health.bot.uptime % 3600) / 60)}m` : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase text-xs tracking-wider mb-1">Tokens Watched</p>
                <p>{health.watchedTokens}</p>
              </div>
            </div>
            {health.rpc.provider === "public" && (
              <p className="text-xs text-yellow-400 mt-4 border border-yellow-400/20 bg-yellow-400/5 rounded px-3 py-2">
                Using public Solana RPC — add a free Helius API key in Railway Variables as <span className="font-bold">HELIUS_API_KEY</span> to avoid rate limiting during swaps.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
