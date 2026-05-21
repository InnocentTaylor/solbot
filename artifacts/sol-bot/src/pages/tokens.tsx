import { useListWatchedTokens } from "@workspace/api-client-react";
import { formatUsd, formatCompactUsd, formatPct, shortenAddress } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Tokens() {
  const { data: tokens, isLoading, refetch } = useListWatchedTokens({ query: { refetchInterval: 10000 } });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Watched Tokens</h1>
          <p className="text-muted-foreground mt-1">Tokens currently passing preliminary filters.</p>
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
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Market Cap</TableHead>
                <TableHead className="text-right">24h Vol</TableHead>
                <TableHead className="text-right">Liquidity</TableHead>
                <TableHead className="text-right">24h Change</TableHead>
                <TableHead className="text-right">Discovered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens?.map((token) => (
                <TableRow key={token.address}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{token.symbol}</span>
                        {token.dexId && <Badge variant="secondary" className="text-[10px] px-1 py-0">{token.dexId}</Badge>}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-muted-foreground">{shortenAddress(token.address, 6)}</span>
                        <a href={`https://solscan.io/token/${token.address}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatUsd(token.priceUsd)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-primary">{formatCompactUsd(token.marketCapUsd)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCompactUsd(token.volume24h)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCompactUsd(token.liquidity)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono text-sm ${token.priceChange24h > 0 ? "text-primary" : "text-destructive"}`}>
                      {formatPct(token.priceChange24h)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(token.firstDiscoveredAt).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!tokens || tokens.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Radar className="mx-auto h-8 w-8 opacity-20 mb-2" />
                    No tokens currently being watched. Radar is scanning...
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
