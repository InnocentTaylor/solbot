import { Router } from "express";
import { db, positionsTable, tradesTable, botConfigTable, activityTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { getBotState, getWatchedTokens } from "../services/botService";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const botState = getBotState();

  const configs = await db.select().from(botConfigTable).limit(1);
  const walletAddress = configs[0]?.walletAddress ?? null;

  const trades = await db.select().from(tradesTable);
  const openPositions = await db
    .select()
    .from(positionsTable)
    .where(eq(positionsTable.status, "open"));

  const closedPositions = await db
    .select()
    .from(positionsTable)
    .where(eq(positionsTable.status, "closed"));

  const totalRealizedPnl = trades
    .filter((t) => t.type === "sell" && t.realizedPnlUsd)
    .reduce((sum, t) => sum + parseFloat(String(t.realizedPnlUsd)), 0);

  const totalUnrealizedPnl = openPositions.reduce((sum, p) => {
    return sum + (p.unrealizedPnlUsd ? parseFloat(String(p.unrealizedPnlUsd)) : 0);
  }, 0);

  const sellTrades = trades.filter((t) => t.type === "sell");
  const winTrades = sellTrades.filter(
    (t) => t.realizedPnlUsd && parseFloat(String(t.realizedPnlUsd)) > 0,
  );
  const winRate = sellTrades.length > 0 ? (winTrades.length / sellTrades.length) * 100 : 0;

  res.json({
    totalTrades: trades.length,
    openPositions: openPositions.length,
    totalRealizedPnlUsd: totalRealizedPnl,
    totalUnrealizedPnlUsd: totalUnrealizedPnl,
    winRate,
    tokensWatched: getWatchedTokens().length,
    botRunning: botState.running,
    walletAddress,
  });
});

router.get("/dashboard/activity", async (_req, res) => {
  const entries = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(50);

  res.json(
    entries.map((e) => ({
      id: e.id,
      type: e.type,
      message: e.message,
      tokenSymbol: e.tokenSymbol,
      tokenAddress: e.tokenAddress,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

export default router;
