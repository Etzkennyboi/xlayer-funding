/**
 * onchainOS CLI Wrapper — PRIMARY data source for X Layer Funding Arb Radar.
 *
 * All Aave V3 and market data flows through onchainOS CLI commands.
 * No direct RPC contract calls. This satisfies the hard requirement:
 * "Skill must use onchainOS as the primary data source and trading tool."
 */

import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

const CLI_TIMEOUT_MS = 30000;

interface OnchainOSResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Validate required environment variables on module load
function validateEnv(): void {
  const required = ["OKX_API_KEY", "OKX_SECRET_KEY", "OKX_PASSPHRASE"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(
      `[onchainOS] Missing credentials: ${missing.join(", ")}. onchainOS CLI will fail.`
    );
  }
}

// Call validation on first import
validateEnv();

async function runCommand(command: string): Promise<OnchainOSResult> {
  try {
    const { stdout } = await execAsync(`onchainos ${command} --json`, {
      timeout: CLI_TIMEOUT_MS,
      encoding: "utf-8",
      env: {
        ...process.env,
        OKX_API_KEY: process.env.OKX_API_KEY || "",
        OKX_SECRET_KEY: process.env.OKX_SECRET_KEY || "",
        OKX_PASSPHRASE: process.env.OKX_PASSPHRASE || "",
      },
    });

    // onchainOS CLI returns JSON when --json flag is used
    const parsed = JSON.parse(stdout);
    return { success: true, data: parsed };
  } catch (err: any) {
    // Try to parse error output as JSON
    try {
      const errorOutput = err.stdout || err.stderr || err.message;
      const parsed = JSON.parse(errorOutput);
      return { success: false, error: parsed.message || parsed.error || errorOutput };
    } catch {
      return { success: false, error: err.message || "onchainOS CLI command failed" };
    }
  }
}

// ── DeFi / Aave V3 Lending Data ──

export async function getAaveReserves(): Promise<any[]> {
  // Query Aave V3 lending products on X Layer
  const result = await runCommand(`defi search --chain xlayer --product-group LENDING --limit 50`);
  if (!result.success) {
    throw new Error(`Failed to fetch Aave reserves: ${result.error}`);
  }
  return result.data?.data || [];
}

export async function getAaveReserveDetail(investmentId: string): Promise<any> {
  // Escape investmentId to prevent shell injection
  const escapedId = investmentId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (escapedId !== investmentId) {
    throw new Error(`Invalid investmentId format: ${investmentId}`);
  }
  const result = await runCommand(`defi detail --investment-id ${escapedId}`);
  if (!result.success) {
    throw new Error(`Failed to fetch reserve detail: ${result.error}`);
  }
  return result.data;
}

// ── Market / Price Data ──

export async function getTokenPrice(tokenAddress: string): Promise<any> {
  const result = await runCommand(`market price --address ${tokenAddress.toLowerCase()} --chain xlayer`);
  if (!result.success) {
    throw new Error(`Failed to fetch price: ${result.error}`);
  }
  return result.data;
}

export async function getTokenPrices(tokenAddresses: string[]): Promise<any[]> {
  const addresses = tokenAddresses.map(a => a.toLowerCase()).join(",");
  const result = await runCommand(`market prices --tokens "${addresses}" --chain xlayer`);
  if (!result.success) {
    throw new Error(`Failed to fetch prices: ${result.error}`);
  }
  return result.data?.data || [];
}

// ── Wallet / Portfolio (for balance checks) ──

export async function getWalletBalances(address: string, chains: string = "xlayer"): Promise<any> {
  // Validate Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  const result = await runCommand(`portfolio all-balances --address ${address.toLowerCase()} --chains "${chains}"`);
  if (!result.success) {
    throw new Error(`Failed to fetch balances: ${result.error}`);
  }
  return result.data;
}

export async function getWalletTotalValue(address: string, chains: string = "xlayer"): Promise<any> {
  // Validate Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  const result = await runCommand(`portfolio total-value --address ${address.toLowerCase()} --chains "${chains}"`);
  if (!result.success) {
    throw new Error(`Failed to fetch total value: ${result.error}`);
  }
  return result.data;
}

// ── Token Search ──

export async function searchToken(query: string, chains: string = "xlayer"): Promise<any[]> {
  // Basic query sanitization (allow alphanumeric, space, dash)
  if (!/^[a-zA-Z0-9\s-]{1,100}$/.test(query)) {
    throw new Error(`Invalid token query: ${query}`);
  }
  const result = await runCommand(`token search --query "${query}" --chains "${chains}"`);
  if (!result.success) {
    throw new Error(`Failed to search token: ${result.error}`);
  }
  return result.data?.data || [];
}
