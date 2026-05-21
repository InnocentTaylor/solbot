# Railway Deployment Guide

This guide walks you through deploying the Solana Meme Bot to Railway so it runs live in the cloud 24/7.

## Prerequisites

- A [Railway](https://railway.app) account
- The GitHub repo is already pushed to `https://github.com/InnocentTaylor/solbot`
- A funded Solana wallet (mainnet)

---

## Step 1: Create a new Railway project

1. Go to [railway.app](https://railway.app) and click **New Project**
2. Select **Deploy from GitHub repo**
3. Authorize Railway to access your GitHub account if prompted
4. Search for and select `InnocentTaylor/solbot`
5. Railway will detect `railway.toml` automatically and configure the build/start commands

---

## Step 2: Add a PostgreSQL database

The bot stores its config and trade history in Postgres.

1. Inside your Railway project, click **+ New** → **Database** → **Add PostgreSQL**
2. Railway will provision a Postgres instance and automatically inject `DATABASE_URL` into your service — no manual configuration needed

---

## Step 3: Configure environment variables

In your Railway project, open the **Variables** tab for your service and add the following:

| Variable | Value | Notes |
|---|---|---|
| `SOLANA_PRIVATE_KEY` | Your base58 wallet private key | **Keep this secret — never share it** |
| `RPC_ENDPOINT` | Your Solana RPC URL (optional) | Defaults to public mainnet. Use a paid provider (Helius, QuickNode) for better reliability. |

> `DATABASE_URL`, `PORT`, and `NODE_ENV` are all set automatically — do **not** add them manually.

### Getting a dedicated RPC endpoint (recommended)

The public Solana endpoint (`api.mainnet-beta.solana.com`) has strict rate limits. For a bot running swap transactions, a dedicated endpoint is strongly recommended:

- **Helius** — [helius.dev](https://helius.dev) (free tier available)
- **QuickNode** — [quicknode.com](https://quicknode.com)
- **Alchemy** — [alchemy.com](https://alchemy.com)

Once you have a URL, set it as `RPC_ENDPOINT` in Railway.

---

## Step 4: Deploy

1. Railway triggers a deploy automatically after you connect the repo
2. Watch the **Deployments** tab — the build takes ~2–3 minutes (installs pnpm, builds frontend + API server)
3. On first deploy, `drizzle-kit push` runs automatically to create the database schema
4. Once the status shows **Active**, the service is live

---

## Step 5: Access the dashboard

1. In your Railway project, open the service and click **Generate Domain** (under **Settings → Networking**)
2. Visit the generated URL — you'll see the Solana Meme Bot dashboard
3. Use the dashboard to configure trading parameters (buy amount, slippage, market cap thresholds) and start the bot

---

## Redeployment & updates

Every push to the `main` branch on GitHub will trigger an automatic redeploy on Railway.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails with "pnpm not found" | Old Node image | Railway uses nixpacks — the build command installs pnpm automatically |
| `SOLANA_PRIVATE_KEY not set` error | Missing env var | Add it in Railway → Variables |
| DB migration fails on start | `DATABASE_URL` not injected | Make sure a PostgreSQL service is added to the same Railway project |
| RPC rate limit errors | Using public endpoint | Set `RPC_ENDPOINT` to a dedicated provider URL |
| Frontend shows blank page | `NODE_ENV` not `production` | Already set via `railway.toml` — redeploy to pick it up |
