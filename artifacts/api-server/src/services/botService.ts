import { db, botConfigTable, positionsTable, tradesTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { buyToken, sellToken, getTokenDecimals, getWalletPublicKey } from "./swapService";

interface DexScreenerToken {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative: string;
  priceUsd: string;
  txns: { h24: { buys: number; sells: number } };
  volume: { h24: number };
  priceChange: { h24: number };
  liquidity: { usd: number };
  fdv: number;
  marketCap: number;
}

interface BotState {
  running: boolean;
  startedAt: Date | null;
  tokensScanned: number;
  lastScanAt: Date | null;
  watchedTokens: Map<string, DexScreenerToken & { firstDiscoveredAt: Date }>;
  intervalId: ReturnType<typeof setInterval> | null;
}

const state: BotState = {
  running: false,
  startedAt: null,
  tokensScanned: 0,
  lastScanAt: null,
  watchedTokens: new Map(),
  intervalId: null,
};

async function logActivity(
  type: string,
  message: string,
  tokenSymbol?: string,
  tokenAddress?: string,
) {
  try {
    await db.insert(activityTable).values({
      type,
      message,
      tokenSymbol: tokenSymbol ?? null,
      tokenAddress: tokenAddress ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to log activity");
  }
}

async function fetchSolanaNewTokens(): Promise<DexScreenerToken[]> {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/search?q=sol&chainIds=solana",
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { pairs?: DexScreenerToken[] };
    return (data.pairs ?? []).filter(
      (p) =>
        p.chainId === "solana" &&
        p.priceUsd &&
        parseFloat(p.priceUsd) > 0 &&
        p.marketCap > 0,
    );
  } catch (err) {
    logger.error({ err }, "Failed to fetch Solana tokens");
    return [];
  }
}

async function getConfig() {
  const configs = await db.select().from(botConfigTable).limit(1);
  if (configs.length === 0) {
    const [newConfig] = await db.insert(botConfigTable).values({}).returning();
    return newConfig;
  }
  return configs[0];
}

async function executeBuy(token: DexScreenerToken, config: typeof botConfigTable.$inferSelect) {
  const priceUsd = parseFloat(token.priceUsd || "0");
  if (priceUsd <= 0) return;

  const amountUsd = 100;

  logger.info({ token: token.baseToken.symbol, amountUsd }, "Attempting real buy via Jupiter");

  const { signature, amountOut } = await buyToken(
    token.baseToken.address,
    amountUsd,
    config.slippageBps,
  );

  const txStatus = signature ? "confirmed" : "failed";
  const amountTokens = amountOut > 0 ? amountOut : amountUsd / priceUsd;

  const [position] = await db
    .insert(positionsTable)
    .values({
      tokenAddress: token.baseToken.address,
      tokenSymbol: token.baseToken.symbol,
      tokenName: token.baseToken.name,
      entryMarketCapUsd: String(token.marketCap),
      currentMarketCapUsd: String(token.marketCap),
      entryPriceUsd: String(priceUsd),
      currentPriceUsd: String(priceUsd),
      amountTokens: String(amountTokens),
      amountUsd: String(amountUsd),
      unrealizedPnlUsd: "0",
      unrealizedPnlPct: "0",
      status: signature ? "open" : "closed",
    })
    .returning();

  await db.insert(tradesTable).values({
    tokenAddress: token.baseToken.address,
    tokenSymbol: token.baseToken.symbol,
    tokenName: token.baseToken.name,
    type: "buy",
    amountUsd: String(amountUsd),
    amountTokens: String(amountTokens),
    priceUsd: String(priceUsd),
    marketCapUsd: String(token.marketCap),
    txSignature: signature,
    status: txStatus,
    realizedPnlUsd: null,
    positionId: position.id,
  });

  if (signature) {
    await logActivity(
      "buy_executed",
      `Bought ${token.baseToken.symbol} at $${priceUsd.toFixed(8)} (mcap: $${(token.marketCap / 1000).toFixed(1)}K) — tx: ${signature.slice(0, 12)}...`,
      token.baseToken.symbol,
      token.baseToken.address,
    );
    logger.info({ token: token.baseToken.symbol, sig: signature }, "Buy confirmed on-chain");
  } else {
    await logActivity(
      "buy_failed",
      `Buy failed for ${token.baseToken.symbol} — swap route unavailable or insufficient funds`,
      token.baseToken.symbol,
      token.baseToken.address,
    );
    logger.warn({ token: token.baseToken.symbol }, "Buy swap failed");
  }
}

async function executeSell(
  position: typeof positionsTable.$inferSelect,
  currentToken: DexScreenerToken,
) {
  const currentPrice = parseFloat(currentToken.priceUsd || "0");
  const amountTokens = parseFloat(position.amountTokens);

  logger.info({ token: position.tokenSymbol, amountTokens }, "Attempting real sell via Jupiter");

  await db
    .update(positionsTable)
    .set({ status: "pending_sell" })
    .where(eq(positionsTable.id, position.id));

  const decimals = await getTokenDecimals(position.tokenAddress);
  const { signature, amountOut } = await sellToken(
    position.tokenAddress,
    amountTokens,
    decimals,
    6,
  );

  const actualAmountUsd = amountOut > 0 ? amountOut : amountTokens * currentPrice;
  const entryUsd = parseFloat(position.amountUsd);
  const pnl = actualAmountUsd - entryUsd;

  const txStatus = signature ? "confirmed" : "failed";
  const newStatus = signature ? "closed" : "open";

  await db
    .update(positionsTable)
    .set({
      status: newStatus,
      currentPriceUsd: String(currentPrice),
      currentMarketCapUsd: String(currentToken.marketCap),
      closedAt: signature ? new Date() : null,
      unrealizedPnlUsd: signature ? "0" : String(actualAmountUsd - entryUsd),
      unrealizedPnlPct: signature ? "0" : String(entryUsd > 0 ? ((actualAmountUsd - entryUsd) / entryUsd) * 100 : 0),
    })
    .where(eq(positionsTable.id, position.id));

  await db.insert(tradesTable).values({
    tokenAddress: position.tokenAddress,
    tokenSymbol: position.tokenSymbol,
    tokenName: position.tokenName,
    type: "sell",
    amountUsd: String(actualAmountUsd),
    amountTokens: String(amountTokens),
    priceUsd: String(currentPrice),
    marketCapUsd: String(currentToken.marketCap),
    txSignature: signature,
    status: txStatus,
    realizedPnlUsd: signature ? String(pnl) : null,
    positionId: position.id,
  });

  if (signature) {
    await logActivity(
      "sell_executed",
      `Sold ${position.tokenSymbol} at $${currentPrice.toFixed(8)} — PnL: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} — tx: ${signature.slice(0, 12)}...`,
      position.tokenSymbol,
      position.tokenAddress,
    );
    logger.info({ token: position.tokenSymbol, pnl, sig: signature }, "Sell confirmed on-chain");
  } else {
    await logActivity(
      "sell_failed",
      `Sell failed for ${position.tokenSymbol} — position remains open`,
      position.tokenSymbol,
      position.tokenAddress,
    );
    logger.warn({ token: position.tokenSymbol }, "Sell swap failed");
  }
}

async function scanLoop() {
  if (!state.running) return;

  try {
    const config = await getConfig();
    const buyThreshold = parseFloat(String(config.buyMarketCapUsd));
    const sellThreshold = parseFloat(String(config.sellMarketCapUsd));

    const tokens = await fetchSolanaNewTokens();
    state.tokensScanned += tokens.length;
    state.lastScanAt = new Date();

    const openPositions = await db
      .select()
      .from(positionsTable)
      .where(eq(positionsTable.status, "open"));

    for (const token of tokens) {
      const mcap = token.marketCap;
      const addr = token.baseToken.address;

      if (!state.watchedTokens.has(addr)) {
        state.watchedTokens.set(addr, { ...token, firstDiscoveredAt: new Date() });
      } else {
        const existing = state.watchedTokens.get(addr)!;
        state.watchedTokens.set(addr, { ...existing, ...token });
      }

      const alreadyOpen = openPositions.find((p) => p.tokenAddress === addr);

      if (
        !alreadyOpen &&
        mcap >= buyThreshold * 0.9 &&
        mcap <= buyThreshold * 1.1 &&
        openPositions.length < config.maxPositions &&
        token.liquidity?.usd > 5000
      ) {
        await executeBuy(token, config);
      }
    }

    for (const position of openPositions) {
      const currentToken = tokens.find(
        (t) => t.baseToken.address === position.tokenAddress,
      );
      if (!currentToken) continue;

      const currentMcap = currentToken.marketCap;
      const currentPrice = parseFloat(currentToken.priceUsd || "0");
      const amountTokens = parseFloat(position.amountTokens);
      const currentValue = amountTokens * currentPrice;
      const entryValue = parseFloat(position.amountUsd);
      const unrealizedPnl = currentValue - entryValue;
      const unrealizedPct = entryValue > 0 ? (unrealizedPnl / entryValue) * 100 : 0;

      await db
        .update(positionsTable)
        .set({
          currentMarketCapUsd: String(currentMcap),
          currentPriceUsd: String(currentPrice),
          unrealizedPnlUsd: String(unrealizedPnl),
          unrealizedPnlPct: String(unrealizedPct),
        })
        .where(eq(positionsTable.id, position.id));

      if (currentMcap >= sellThreshold) {
        await executeSell(position, currentToken);
      }
    }

    if (tokens.length > 0) {
      await logActivity(
        "scan_completed",
        `Scanned ${tokens.length} Solana tokens. Watching ${state.watchedTokens.size} total.`,
      );
    }
  } catch (err) {
    logger.error({ err }, "Error in scan loop");
  }
}

export function getBotState() {
  return {
    running: state.running,
    startedAt: state.startedAt?.toISOString() ?? null,
    uptime: state.startedAt
      ? Math.floor((Date.now() - state.startedAt.getTime()) / 1000)
      : null,
    tokensScanned: state.tokensScanned,
    lastScanAt: state.lastScanAt?.toISOString() ?? null,
  };
}

export function getWatchedTokens() {
  return Array.from(state.watchedTokens.values())
    .slice(0, 100)
    .map((t) => ({
      address: t.baseToken.address,
      symbol: t.baseToken.symbol,
      name: t.baseToken.name,
      marketCapUsd: t.marketCap,
      priceUsd: parseFloat(t.priceUsd || "0"),
      volume24h: t.volume?.h24 ?? 0,
      priceChange24h: t.priceChange?.h24 ?? 0,
      liquidity: t.liquidity?.usd ?? 0,
      pairAddress: t.pairAddress ?? null,
      dexId: t.dexId ?? null,
      firstDiscoveredAt: (t as { firstDiscoveredAt: Date }).firstDiscoveredAt.toISOString(),
    }));
}

export async function startBot(): Promise<void> {
  if (state.running) return;

  const walletKey = getWalletPublicKey();
  state.running = true;
  state.startedAt = new Date();
  state.tokensScanned = 0;

  await logActivity(
    "bot_started",
    `Bot started with wallet ${walletKey.slice(0, 8)}...${walletKey.slice(-4)} — live trading enabled`,
  );
  logger.info({ wallet: walletKey }, "Bot started with live trading");

  await scanLoop();

  state.intervalId = setInterval(() => {
    scanLoop().catch((err) => logger.error({ err }, "Scan loop error"));
  }, 30000);
}

export async function stopBot(): Promise<void> {
  if (!state.running) return;
  state.running = false;

  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }

  await logActivity("bot_stopped", "Bot stopped");
  logger.info("Bot stopped");
}
