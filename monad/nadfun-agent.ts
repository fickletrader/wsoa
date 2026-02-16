/**
 * WSOA nad.fun Trading Agent
 *
 * Autonomous agent that trades tokens on nad.fun (Monad mainnet).
 * This is the bridge from simulated WSOA competition to real on-chain trading.
 *
 * Usage:
 *   npx tsx nadfun-agent.ts buy  <token_address> <mon_amount>
 *   npx tsx nadfun-agent.ts sell <token_address>
 *   npx tsx nadfun-agent.ts quote <token_address> <mon_amount>
 *
 * Env vars (from ../.env):
 *   MONAD_PRIVATE_KEY  - wallet private key (with MON for gas)
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync, readFileSync, existsSync } from "fs";

config({ path: resolve(import.meta.dirname, "../.env") });

// --- Monad mainnet config ---
const MONAD_MAINNET: Chain = {
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://monad-mainnet.drpc.org"] } },
};

const LENS = "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea" as const;
const BONDING_CURVE_ROUTER =
  "0x6F6B8F1a20703309951a5127c45B49b1CD981A22" as const;

// --- ABIs (minimal, only what we need) ---
const lensAbi = [
  {
    type: "function",
    name: "getAmountOut",
    inputs: [
      { name: "_token", type: "address" },
      { name: "_amountIn", type: "uint256" },
      { name: "_isBuy", type: "bool" },
    ],
    outputs: [
      { name: "router", type: "address" },
      { name: "amountOut", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

const routerAbi = [
  {
    type: "function",
    name: "buy",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "amountOutMin", type: "uint256" },
          { name: "token", type: "address" },
          { name: "to", type: "address" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sell",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMin", type: "uint256" },
          { name: "token", type: "address" },
          { name: "to", type: "address" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

// --- TX log file (shared with frontend) ---
const TX_LOG = resolve(import.meta.dirname, "tx_log.json");

function loadTxLog(): Array<Record<string, unknown>> {
  if (existsSync(TX_LOG)) {
    return JSON.parse(readFileSync(TX_LOG, "utf-8"));
  }
  return [];
}

function appendTx(entry: Record<string, unknown>) {
  const log = loadTxLog();
  log.push(entry);
  writeFileSync(TX_LOG, JSON.stringify(log, null, 2));
}

// --- Setup clients ---
function setup() {
  const pk = process.env.MONAD_PRIVATE_KEY;
  if (!pk) {
    console.error("Error: MONAD_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk as `0x${string}`);

  const publicClient = createPublicClient({
    chain: MONAD_MAINNET,
    transport: http("https://monad-mainnet.drpc.org"),
  });

  const walletClient = createWalletClient({
    account,
    chain: MONAD_MAINNET,
    transport: http("https://monad-mainnet.drpc.org"),
  });

  return { account, publicClient, walletClient };
}

// --- Commands ---

async function quote(tokenAddress: `0x${string}`, monAmount: string) {
  const { publicClient } = setup();
  const [router, amountOut] = await publicClient.readContract({
    address: LENS,
    abi: lensAbi,
    functionName: "getAmountOut",
    args: [tokenAddress, parseEther(monAmount), true],
  });
  console.log(`Quote: ${monAmount} MON -> ${formatEther(amountOut)} tokens`);
  console.log(`Router: ${router}`);
  return { router, amountOut };
}

async function buy(tokenAddress: `0x${string}`, monAmount: string) {
  const { account, publicClient, walletClient } = setup();

  console.log(
    `[WSOA Agent] Buying token ${tokenAddress} with ${monAmount} MON`
  );
  console.log(`[WSOA Agent] Wallet: ${account.address}`);

  // 1. Get quote
  const [router, amountOut] = await publicClient.readContract({
    address: LENS,
    abi: lensAbi,
    functionName: "getAmountOut",
    args: [tokenAddress, parseEther(monAmount), true],
  });
  console.log(`[WSOA Agent] Expected tokens: ${formatEther(amountOut)}`);

  // 2. Slippage (2%)
  const amountOutMin = (amountOut * 98n) / 100n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

  // 3. Execute buy
  const callData = encodeFunctionData({
    abi: routerAbi,
    functionName: "buy",
    args: [
      {
        amountOutMin,
        token: tokenAddress,
        to: account.address,
        deadline,
      },
    ],
  });

  console.log(`[WSOA Agent] Sending buy transaction...`);
  const hash = await walletClient.sendTransaction({
    account,
    to: router,
    data: callData,
    value: parseEther(monAmount),
    chain: MONAD_MAINNET,
  });

  console.log(`[WSOA Agent] TX hash: ${hash}`);
  console.log(`[WSOA Agent] Explorer: https://monadexplorer.com/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[WSOA Agent] Status: ${receipt.status}`);

  appendTx({
    action: "buy",
    token: tokenAddress,
    monAmount,
    expectedTokens: formatEther(amountOut),
    hash,
    status: receipt.status,
    timestamp: new Date().toISOString(),
    blockNumber: Number(receipt.blockNumber),
    wallet: account.address,
  });

  return hash;
}

async function sell(tokenAddress: `0x${string}`) {
  const { account, publicClient, walletClient } = setup();

  console.log(`[WSOA Agent] Selling token ${tokenAddress}`);
  console.log(`[WSOA Agent] Wallet: ${account.address}`);

  // 1. Get balance
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  if (balance === 0n) {
    console.log("[WSOA Agent] No tokens to sell");
    return;
  }
  console.log(`[WSOA Agent] Balance: ${formatEther(balance)} tokens`);

  // 2. Get quote
  const [router, amountOut] = await publicClient.readContract({
    address: LENS,
    abi: lensAbi,
    functionName: "getAmountOut",
    args: [tokenAddress, balance, false],
  });
  console.log(`[WSOA Agent] Expected MON: ${formatEther(amountOut)}`);

  // 3. Approve
  console.log(`[WSOA Agent] Approving...`);
  const approveHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [router, balance],
    account,
    chain: MONAD_MAINNET,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 4. Execute sell
  const amountOutMin = (amountOut * 98n) / 100n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

  const callData = encodeFunctionData({
    abi: routerAbi,
    functionName: "sell",
    args: [
      {
        amountIn: balance,
        amountOutMin,
        token: tokenAddress,
        to: account.address,
        deadline,
      },
    ],
  });

  console.log(`[WSOA Agent] Sending sell transaction...`);
  const hash = await walletClient.sendTransaction({
    account,
    to: router,
    data: callData,
    chain: MONAD_MAINNET,
  });

  console.log(`[WSOA Agent] TX hash: ${hash}`);
  console.log(`[WSOA Agent] Explorer: https://monadexplorer.com/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[WSOA Agent] Status: ${receipt.status}`);

  appendTx({
    action: "sell",
    token: tokenAddress,
    tokenAmount: formatEther(balance),
    expectedMon: formatEther(amountOut),
    hash,
    status: receipt.status,
    timestamp: new Date().toISOString(),
    blockNumber: Number(receipt.blockNumber),
    wallet: account.address,
  });

  return hash;
}

// --- CLI ---
const [, , command, tokenAddr, amount] = process.argv;

if (!command || !tokenAddr) {
  console.log("WSOA nad.fun Trading Agent");
  console.log("");
  console.log("Usage:");
  console.log("  npx tsx nadfun-agent.ts quote <token> <mon_amount>");
  console.log("  npx tsx nadfun-agent.ts buy   <token> <mon_amount>");
  console.log("  npx tsx nadfun-agent.ts sell  <token>");
  process.exit(0);
}

const token = tokenAddr as `0x${string}`;

switch (command) {
  case "quote":
    if (!amount) {
      console.error("quote requires <mon_amount>");
      process.exit(1);
    }
    await quote(token, amount);
    break;
  case "buy":
    if (!amount) {
      console.error("buy requires <mon_amount>");
      process.exit(1);
    }
    await buy(token, amount);
    break;
  case "sell":
    await sell(token);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
