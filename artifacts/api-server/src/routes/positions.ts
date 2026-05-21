import { Router } from "express";
import { db, positionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GetPositionParams } from "@workspace/api-zod";

const router = Router();

function serializePosition(p: typeof positionsTable.$inferSelect) {
  return {
    id: p.id,
    tokenAddress: p.tokenAddress,
    tokenSymbol: p.tokenSymbol,
    tokenName: p.tokenName,
    entryMarketCapUsd: parseFloat(String(p.entryMarketCapUsd)),
    currentMarketCapUsd: p.currentMarketCapUsd ? parseFloat(String(p.currentMarketCapUsd)) : null,
    entryPriceUsd: parseFloat(String(p.entryPriceUsd)),
    currentPriceUsd: p.currentPriceUsd ? parseFloat(String(p.currentPriceUsd)) : null,
    amountTokens: parseFloat(String(p.amountTokens)),
    amountUsd: parseFloat(String(p.amountUsd)),
    unrealizedPnlUsd: p.unrealizedPnlUsd ? parseFloat(String(p.unrealizedPnlUsd)) : null,
    unrealizedPnlPct: p.unrealizedPnlPct ? parseFloat(String(p.unrealizedPnlPct)) : null,
    status: p.status,
    openedAt: p.openedAt.toISOString(),
    closedAt: p.closedAt ? p.closedAt.toISOString() : null,
  };
}

router.get("/positions", async (_req, res) => {
  const positions = await db
    .select()
    .from(positionsTable)
    .orderBy(desc(positionsTable.openedAt));
  res.json(positions.map(serializePosition));
});

router.get("/positions/:id", async (req, res) => {
  const params = GetPositionParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [position] = await db
    .select()
    .from(positionsTable)
    .where(eq(positionsTable.id, params.data.id));
  if (!position) {
    res.status(404).json({ error: "Position not found" });
    return;
  }
  res.json(serializePosition(position));
});

export default router;
