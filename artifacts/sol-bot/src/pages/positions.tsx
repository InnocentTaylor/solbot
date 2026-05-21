import { useListPositions } from "@workspace/api-client-react";
import { formatUsd, formatCompactUsd, formatPct, cnPnl, shortenAddress } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Positions() {
  const { data: positions, isLoading, refetch } = useListPositions({ query: { refetchInterval: 10000 } });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'open':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Open</Badge>;
      case 'pending_sell':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending Sell</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Positions</h1>
          <p className="text-muted-foreground mt-1">Active and historical token holdings.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Entry MCap</TableHead>
                <TableHead className="text-right">Current MCap</TableHead>
                <TableHead className="text-right">Value (USD)</TableHead>
                <TableHead className="text-right">Unrealized PnL</TableHead>
                <TableHead className="text-right">Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions?.map((position) => (
                <TableRow key={position.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{position.tokenSymbol}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a href={`https://solscan.io/token/${position.tokenAddress}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>View on Solscan</TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">{shortenAddress(position.tokenAddress, 6)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(position.status)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCompactUsd(position.entryMarketCapUsd)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {position.currentMarketCapUsd ? formatCompactUsd(position.currentMarketCapUsd) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatUsd(position.amountUsd)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-mono text-sm font-bold ${cnPnl(position.unrealizedPnlUsd)}`}>
                        {formatUsd(position.unrealizedPnlUsd)}
                      </span>
                      <span className={`text-xs font-mono ${cnPnl(position.unrealizedPnlPct)}`}>
                        {formatPct(position.unrealizedPnlPct)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(position.openedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!positions || positions.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No positions found. Wait for the bot to snipe some tokens.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
