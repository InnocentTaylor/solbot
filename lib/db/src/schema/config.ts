import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botConfigTable = pgTable("bot_config", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address"),
  buyMarketCapUsd: numeric("buy_market_cap_usd", { precision: 20, scale: 2 }).notNull().default("10000"),
  sellMarketCapUsd: numeric("sell_market_cap_usd", { precision: 20, scale: 2 }).notNull().default("35000"),
  maxPositions: integer("max_positions").notNull().default(5),
  slippageBps: integer("slippage_bps").notNull().default(300),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBotConfigSchema = createInsertSchema(botConfigTable).omit({ id: true });
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotConfig = typeof botConfigTable.$inferSelect;
