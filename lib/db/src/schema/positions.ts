import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const positionsTable = pgTable("positions", {
  id: serial("id").primaryKey(),
  tokenAddress: text("token_address").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenName: text("token_name").notNull(),
  entryMarketCapUsd: numeric("entry_market_cap_usd", { precision: 20, scale: 2 }).notNull(),
  currentMarketCapUsd: numeric("current_market_cap_usd", { precision: 20, scale: 2 }),
  entryPriceUsd: numeric("entry_price_usd", { precision: 30, scale: 12 }).notNull(),
  currentPriceUsd: numeric("current_price_usd", { precision: 30, scale: 12 }),
  amountTokens: numeric("amount_tokens", { precision: 30, scale: 6 }).notNull(),
  amountUsd: numeric("amount_usd", { precision: 20, scale: 2 }).notNull(),
  unrealizedPnlUsd: numeric("unrealized_pnl_usd", { precision: 20, scale: 2 }),
  unrealizedPnlPct: numeric("unrealized_pnl_pct", { precision: 10, scale: 4 }),
  status: text("status").notNull().default("open"),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const insertPositionSchema = createInsertSchema(positionsTable).omit({ id: true });
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positionsTable.$inferSelect;
