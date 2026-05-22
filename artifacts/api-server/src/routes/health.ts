import { Router } from "express";
import { Connection } from "@solana/web3.js";
import { getBotState, getWatchedTokens } from "../services/botService";
import { db, botConfigTable } from "@workspace/db";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/healthz/detailed", async (_req, res) => {
  const botState = getBotState();

  let rpcStatus: "ok" | "degraded" | "down" = "ok";
  let rpcLatencyMs: number | null = null;

  try {
    const rpcEndpoint =
      process.env.RPC_ENDPOINT ??
      (process.env.HELIUS_API_KEY
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : "https://api.mainnet-beta.solana.com");

    const connection = new Connection(rpcEndpoint, "confirmed");
    const start = Date.now();
    await connection.getSlot();
    rpcLatencyMs = Date.now() - start;
    rpcStatus = rpcLatencyMs < 2000 ? "ok" : "degraded";
  } catch {
    rpcStatus = "down";
  }

  let walletAddress: string | null = null;
  try {
    const configs = await db.select().from(botConfigTable).limit(1);
    walletAddress = configs[0]?.walletAddress ?? null;
  } catch {
    walletAddress = null;
  }

  const isStale =
    botState.running &&
    botState.lastScanAt !== null &&
    Date.now() - new Date(botState.lastScanAt).getTime() > 5 * 60 * 1000;

  res.json({
    status: rpcStatus === "down" ? "degraded" : "ok",
    bot: {
      running: botState.running,
      uptime: botState.uptime,
      lastScanAt: botState.lastScanAt,
      tokensScanned: botState.tokensScanned,
      isStale,
    },
    rpc: {
      status: rpcStatus,
      latencyMs: rpcLatencyMs,
      provider: process.env.HELIUS_API_KEY
        ? "helius"
        : process.env.RPC_ENDPOINT
          ? "custom"
          : "public",
    },
    wallet: {
      address: walletAddress,
    },
    watchedTokens: getWatchedTokens().length,
    timestamp: new Date().toISOString(),
  });
});

export default router;
