import { Router } from "express";
import { db, botConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateConfigBody } from "@workspace/api-zod";

const router = Router();

async function getOrCreateConfig() {
  const configs = await db.select().from(botConfigTable).limit(1);
  if (configs.length === 0) {
    const [newConfig] = await db.insert(botConfigTable).values({}).returning();
    return newConfig;
  }
  return configs[0];
}

function serializeConfig(config: typeof botConfigTable.$inferSelect) {
  return {
    id: config.id,
    walletAddress: config.walletAddress,
    buyMarketCapUsd: parseFloat(String(config.buyMarketCapUsd)),
    sellMarketCapUsd: parseFloat(String(config.sellMarketCapUsd)),
    buyAmountUsd: parseFloat(String(config.buyAmountUsd)),
    maxPositions: config.maxPositions,
    slippageBps: config.slippageBps,
    updatedAt: config.updatedAt.toISOString(),
  };
}

router.get("/config", async (_req, res) => {
  const config = await getOrCreateConfig();
  res.json(serializeConfig(config));
});

router.put("/config", async (req, res) => {
  const parsed = UpdateConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const config = await getOrCreateConfig();
  const body = parsed.data;

  const updates: Partial<typeof botConfigTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.walletAddress !== undefined) updates.walletAddress = body.walletAddress;
  if (body.buyMarketCapUsd !== undefined) updates.buyMarketCapUsd = String(body.buyMarketCapUsd);
  if (body.sellMarketCapUsd !== undefined) updates.sellMarketCapUsd = String(body.sellMarketCapUsd);
  if (body.buyAmountUsd !== undefined) updates.buyAmountUsd = String(body.buyAmountUsd);
  if (body.maxPositions !== undefined) updates.maxPositions = body.maxPositions;
  if (body.slippageBps !== undefined) updates.slippageBps = body.slippageBps;

  const [updated] = await db
    .update(botConfigTable)
    .set(updates)
    .where(eq(botConfigTable.id, config.id))
    .returning();

  res.json(serializeConfig(updated));
});

export default router;
