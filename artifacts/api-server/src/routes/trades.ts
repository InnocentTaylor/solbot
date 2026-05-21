import { Router } from "express";
import { db, tradesTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { ListTradesQueryParams } from "@workspace/api-zod";

const router = Router();

function serializeTrade(t: typeof tradesTable.$inferSelect) {
  return {
    id: t.id,
    tokenAddress: t.tokenAddress,
    tokenSymbol: t.tokenSymbol,
    tokenName: t.tokenName,
    type: t.type,
    amountUsd: parseFloat(String(t.amountUsd)),
    amountTokens: parseFloat(String(t.amountTokens)),
    priceUsd: parseFloat(String(t.priceUsd)),
    marketCapUsd: parseFloat(String(t.marketCapUsd)),
    txSignature: t.txSignature,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    realizedPnlUsd: t.realizedPnlUsd ? parseFloat(String(t.realizedPnlUsd)) : null,
  };
}

router.get("/trades", async (req, res) => {
  const parsed = ListTradesQueryParams.safeParse({
    limit: req.query.limit ? parseInt(String(req.query.limit)) : 50,
    offset: req.query.offset ? parseInt(String(req.query.offset)) : 0,
  });
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

  const trades = await db
    .select()
    .from(tradesTable)
    .orderBy(desc(tradesTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(trades.map(serializeTrade));
});

export default router;
