import { pgTable, serial, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  tokenAddress: text("token_address").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenName: text("token_name").notNull(),
  type: text("type").notNull(),
  amountUsd: numeric("amount_usd", { precision: 20, scale: 2 }).notNull(),
  amountTokens: numeric("amount_tokens", { precision: 30, scale: 6 }).notNull(),
  priceUsd: numeric("price_usd", { precision: 30, scale: 12 }).notNull(),
  marketCapUsd: numeric("market_cap_usd", { precision: 20, scale: 2 }).notNull(),
  txSignature: text("tx_signature"),
  status: text("status").notNull().default("confirmed"),
  realizedPnlUsd: numeric("realized_pnl_usd", { precision: 20, scale: 2 }),
  positionId: integer("position_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
