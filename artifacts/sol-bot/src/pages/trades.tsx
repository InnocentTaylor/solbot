import { useListTrades } from "@workspace/api-client-react";
import { formatUsd, formatCompactUsd, cnPnl, shortenAddress } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Trades() {
  const { data: trades, isLoading, refetch } = useListTrades({}, { query: { refetchInterval: 15000 } });

  const getTypeBadge = (type: string) => {
    if (type === 'buy') {
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Buy</Badge>;
    }
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Sell</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed':
        return <span className="text-primary text-xs uppercase tracking-wider font-medium">Confirmed</span>;
      case 'pending':
        return <span className="text-yellow-500 text-xs uppercase tracking-wider font-medium animate-pulse">Pending</span>;
      case 'failed':
        return <span className="text-destructive text-xs uppercase tracking-wider font-medium">Failed</span>;
      default:
        return <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade History</h1>
          <p className="text-muted-foreground mt-1">Complete log of all bot transactions.</p>
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
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Token</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Market Cap</TableHead>
                <TableHead className="text-right">Amount (USD)</TableHead>
                <TableHead className="text-right">Realized PnL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tx</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades?.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(trade.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{getTypeBadge(trade.type)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{trade.tokenSymbol}</span>
                      <span className="text-xs text-muted-foreground">{shortenAddress(trade.tokenAddress, 6)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatUsd(trade.priceUsd)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCompactUsd(trade.marketCapUsd)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatUsd(trade.amountUsd)}</TableCell>
                  <TableCell className="text-right">
                    {trade.realizedPnlUsd != null ? (
                      <span className={`font-mono text-sm font-bold ${cnPnl(trade.realizedPnlUsd)}`}>
                        {formatUsd(trade.realizedPnlUsd)}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(trade.status)}</TableCell>
                  <TableCell className="text-right">
                    {trade.txSignature ? (
                      <a 
                        href={`https://solscan.io/tx/${trade.txSignature}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        {shortenAddress(trade.txSignature, 4)}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    ) : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {(!trades || trades.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No trades executed yet.
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
