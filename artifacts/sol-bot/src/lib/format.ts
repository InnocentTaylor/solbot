export function formatUsd(val: number | null | undefined): string {
  if (val == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatCompactUsd(val: number | null | undefined): string {
  if (val == null) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(val);
}

export function formatPct(val: number | null | undefined): string {
  if (val == null) return "0.00%";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

export function cnPnl(val: number | null | undefined): string {
  if (val == null || val === 0) return "text-muted-foreground";
  return val > 0 ? "text-primary" : "text-destructive";
}

export function shortenAddress(address: string | null | undefined, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
