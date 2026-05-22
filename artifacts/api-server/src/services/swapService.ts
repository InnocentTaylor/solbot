import {
  Connection,
  Keypair,
  VersionedTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { logger } from "../lib/logger";

const SOL_MINT = "So11111111111111111111111111111111111111112";

function getRpcEndpoint(): string {
  if (process.env.RPC_ENDPOINT) return process.env.RPC_ENDPOINT;
  if (process.env.HELIUS_API_KEY)
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  return "https://api.mainnet-beta.solana.com";
}

const RPC_ENDPOINT = getRpcEndpoint();

let _keypair: Keypair | null = null;

function getKeypair(): Keypair {
  if (_keypair) return _keypair;
  const raw = process.env.SOLANA_PRIVATE_KEY;
  if (!raw) throw new Error("SOLANA_PRIVATE_KEY not set");
  const decoded = bs58.decode(raw.trim());
  _keypair = Keypair.fromSecretKey(decoded);
  return _keypair;
}

export function getWalletPublicKey(): string {
  return getKeypair().publicKey.toBase58();
}

export async function getSOLBalance(): Promise<number> {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const kp = getKeypair();
  const lamports = await connection.getBalance(kp.publicKey);
  return lamports / LAMPORTS_PER_SOL;
}

export async function getSolPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112",
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      data: { [mint: string]: { price: number } };
    };
    return data.data[SOL_MINT]?.price ?? 0;
  } catch (err) {
    logger.error({ err }, "Failed to fetch SOL price");
    return 0;
  }
}

interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  routePlan: unknown[];
}

async function getQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number,
  slippageBps: number,
): Promise<JupiterQuote | null> {
  const url =
    `https://quote-api.jup.ag/v6/quote` +
    `?inputMint=${inputMint}` +
    `&outputMint=${outputMint}` +
    `&amount=${Math.floor(amountLamports)}` +
    `&slippageBps=${slippageBps}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, text }, "Jupiter quote failed");
    return null;
  }
  return res.json() as Promise<JupiterQuote>;
}

async function executeSwap(quote: JupiterQuote): Promise<string | null> {
  const kp = getKeypair();
  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: kp.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });

  if (!swapRes.ok) {
    const text = await swapRes.text();
    logger.error({ status: swapRes.status, text }, "Jupiter swap route failed");
    return null;
  }

  const { swapTransaction } = (await swapRes.json()) as {
    swapTransaction: string;
  };

  const txBuf = Buffer.from(swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([kp]);

  const sig = await connection.sendTransaction(tx, {
    maxRetries: 3,
    skipPreflight: false,
  });

  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    { signature: sig, ...latestBlockhash },
    "confirmed",
  );

  logger.info({ sig }, "Swap confirmed on-chain");
  return sig;
}

export async function buyTokenWithSOL(
  tokenMint: string,
  usdAmount: number,
  slippageBps: number,
): Promise<{ signature: string | null; amountOut: number; solSpent: number }> {
  try {
    const solPrice = await getSolPriceUsd();
    if (solPrice <= 0) {
      logger.error("Could not fetch SOL price — aborting buy");
      return { signature: null, amountOut: 0, solSpent: 0 };
    }

    const solAmount = usdAmount / solPrice;
    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

    logger.info(
      { usdAmount, solAmount, lamports, slippageBps },
      "Buying with SOL via Jupiter",
    );

    const quote = await getQuote(SOL_MINT, tokenMint, lamports, slippageBps);
    if (!quote) return { signature: null, amountOut: 0, solSpent: 0 };

    const amountOut = parseFloat(quote.outAmount);
    const sig = await executeSwap(quote);
    return { signature: sig, amountOut, solSpent: solAmount };
  } catch (err) {
    logger.error({ err, tokenMint }, "buyTokenWithSOL error");
    return { signature: null, amountOut: 0, solSpent: 0 };
  }
}

export async function sellToken(
  tokenMint: string,
  tokenAmount: number,
  tokenDecimals: number,
  slippageBps: number,
): Promise<{ signature: string | null; solReceived: number }> {
  try {
    const amountIn = Math.floor(tokenAmount * Math.pow(10, tokenDecimals));
    const quote = await getQuote(tokenMint, SOL_MINT, amountIn, slippageBps);
    if (!quote) return { signature: null, solReceived: 0 };

    const solReceived = parseFloat(quote.outAmount) / LAMPORTS_PER_SOL;
    const sig = await executeSwap(quote);
    return { signature: sig, solReceived };
  } catch (err) {
    logger.error({ err, tokenMint }, "sellToken error");
    return { signature: null, solReceived: 0 };
  }
}

export async function getTokenDecimals(mint: string): Promise<number> {
  try {
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const info = await connection.getParsedAccountInfo(new PublicKey(mint));
    const data = (info.value?.data as { parsed?: { info?: { decimals?: number } } })?.parsed;
    return data?.info?.decimals ?? 6;
  } catch {
    return 6;
  }
}
