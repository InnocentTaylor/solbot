import {
  Connection,
  Keypair,
  VersionedTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { logger } from "../lib/logger";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

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

async function executeSwap(
  quote: JupiterQuote,
  slippageBps: number,
): Promise<string | null> {
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

export async function buyToken(
  tokenMint: string,
  usdcAmount: number,
  slippageBps: number,
): Promise<{ signature: string | null; amountOut: number }> {
  try {
    const amountIn = Math.floor(usdcAmount * 1_000_000);
    const quote = await getQuote(USDC_MINT, tokenMint, amountIn, slippageBps);
    if (!quote) return { signature: null, amountOut: 0 };

    const amountOut = parseFloat(quote.outAmount);
    const sig = await executeSwap(quote, slippageBps);
    return { signature: sig, amountOut };
  } catch (err) {
    logger.error({ err, tokenMint }, "buyToken error");
    return { signature: null, amountOut: 0 };
  }
}

export async function sellToken(
  tokenMint: string,
  tokenAmount: number,
  tokenDecimals: number,
  slippageBps: number,
): Promise<{ signature: string | null; amountOut: number }> {
  try {
    const amountIn = Math.floor(tokenAmount * Math.pow(10, tokenDecimals));
    const quote = await getQuote(tokenMint, USDC_MINT, amountIn, slippageBps);
    if (!quote) return { signature: null, amountOut: 0 };

    const amountOut = parseFloat(quote.outAmount) / 1_000_000;
    const sig = await executeSwap(quote, slippageBps);
    return { signature: sig, amountOut };
  } catch (err) {
    logger.error({ err, tokenMint }, "sellToken error");
    return { signature: null, amountOut: 0 };
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
