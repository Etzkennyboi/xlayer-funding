/**
 * Funding Rate Arbitrage Engine
 *
 * Core differentiator: detects risk-free yield by comparing:
 * 1. Hyperliquid perpetual funding rates (supplemental source)
 * 2. Aave V3 borrow/supply costs (PRIMARY: onchainOS)
 *
 * No existing plugin covers cross-protocol funding arbitrage.
 */

import * as onchainOS from "../utils/onchainos";

// ── Types ──

export interface FundingArbOpportunity {
  asset: string;
  aaveBorrowApy: number;
  aaveSupplyApy: number;
  hyperliquidFundingApy: number;
  direction: "SHORT_PERP_BORROW" | "LONG_PERP_SUPPLY" | "NO_ARB";
  spread: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  maxPositionSize: number;
  explanation: string;
}

export interface ArbRiskAnalysis {
  asset: string;
  direction: string;
  maxLeverage: number;
  recommendedSize: string;
  liquidationBuffer: string;
  risks: string[];
  hedgeRecommendation: string;
}

// ── Hyperliquid API (Supplemental — perp funding not in onchainOS yet) ──

interface HyperliquidFundingEntry {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

// Simple in-memory cache for Hyperliquid funding (resets on restart)
const FUNDING_CACHE: Record<string, { rate: number; timestamp: number }> = {};
const FUNDING_CACHE_TTL_MS = 3600000; // 1 hour cache

async function fetchHyperliquidFunding(coin: string): Promise<number> {
  // Check cache first
  const cached = FUNDING_CACHE[coin];
  if (cached && Date.now() - cached.timestamp < FUNDING_CACHE_TTL_MS) {
    return cached.rate;
  }

  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const res = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fundingHistory",
          coin,
          startTime: Date.now() - 86400000, // Last 24h
          endTime: Date.now(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Hyperliquid API error: ${res.status}`);
      }

      const data = (await res.json()) as HyperliquidFundingEntry[];
      if (!data || data.length === 0) {
        // Return cached value if available, otherwise 0
        if (cached) {
          return cached.rate;
        }
        return 0;
      }

      // Average hourly funding rate over last 24h
      const avgHourlyRate = data.reduce((sum, entry) => {
        return sum + parseFloat(entry.fundingRate);
      }, 0) / data.length;

      // Annualize: hourly rate * 24 hours * 365 days * 100 for percentage
      const annualizedRate = avgHourlyRate * 24 * 365 * 100;
      
      // Cache the result
      FUNDING_CACHE[coin] = {
        rate: annualizedRate,
        timestamp: Date.now(),
      };

      return annualizedRate;
    } catch (err: any) {
      attempts++;
      if (attempts >= maxAttempts) {
        // Return cached value as fallback, otherwise throw
        if (cached) {
          console.warn(
            `[fetchHyperliquidFunding] Max retries reached for ${coin}. Using cached value.`
          );
          return cached.rate;
        }
        throw err;
      }
      // Exponential backoff: 500ms, 1000ms, 2000ms
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * Math.pow(2, attempts - 1))
      );
    }
  }

  return 0;
}

// Map asset symbols to Hyperliquid coin names
const ASSET_TO_HL_COIN: Record<string, string> = {
  ETH: "ETH",
  BTC: "BTC",
  SOL: "SOL",
  HYPE: "HYPE",
  ARB: "ARB",
  WETH: "ETH",
  WBTC: "BTC",
  USDC: "USDC",
  USDT: "USDT",
};

// ── Aave Reserve Parser ──

interface ParsedAaveReserve {
  asset: string;
  investmentId: string;
  supplyApy: number;
  borrowApy: number;
  tvl: number;
  tokenAddress: string;
  underlyingSymbol: string;
}

function parseAaveReserve(raw: any): ParsedAaveReserve | null {
  try {
    const underlying = raw.underlyingToken || {};
    const symbol = underlying.symbol || raw.name || "";
    const rate = parseFloat(raw.rate || 0); // Supply rate
    const borrowRate = parseFloat(raw.borrowRate || raw.extraData?.borrowRate || 0);
    const tvl = parseFloat(raw.tvl || 0);

    return {
      asset: symbol.toUpperCase(),
      investmentId: raw.investmentId || "",
      supplyApy: rate * 100,
      borrowApy: borrowRate * 100,
      tvl,
      tokenAddress: underlying.tokenContractAddress || "",
      underlyingSymbol: symbol.toUpperCase(),
    };
  } catch {
    return null;
  }
}

// ── Main Engine: Scan for Arbitrage ──

export async function scanFundingArbitrage(): Promise<FundingArbOpportunity[]> {
  // Step 1: Fetch Aave V3 reserves via onchainOS (PRIMARY)
  let rawReserves: any[] = [];
  try {
    rawReserves = await onchainOS.getAaveReserves();
  } catch (err: any) {
    throw new Error(
      `onchainOS connection failed: ${err.message}. Ensure onchainOS CLI is installed and credentials are set.`
    );
  }
  
  const reserves = rawReserves
    .map(parseAaveReserve)
    .filter((r): r is ParsedAaveReserve => r !== null);

  if (reserves.length === 0) {
    throw new Error(
      "No Aave V3 reserves found on X Layer. Verify onchainOS CLI is installed, credentials are set, and X Layer Aave is active."
    );
  }

  // Step 2: Check each asset against Hyperliquid funding
  const opportunities: FundingArbOpportunity[] = [];
  const checkedAssets = new Set<string>();

  for (const reserve of reserves) {
    const hlCoin = ASSET_TO_HL_COIN[reserve.asset];
    if (!hlCoin || checkedAssets.has(hlCoin)) continue;
    checkedAssets.add(hlCoin);

    try {
      const fundingApy = await fetchHyperliquidFunding(hlCoin);

      // Scenario A: Positive funding (longs pay shorts) > borrow cost
      // Action: Borrow on Aave, short perp, collect funding
      // Only trade if spread is > 5% (minimum profitability threshold)
      if (fundingApy > 0 && fundingApy > reserve.borrowApy) {
        const spread = fundingApy - reserve.borrowApy;
        if (spread < 5) continue; // Skip thin spreads
        
        // Conservative: 0.05% of reserve or $10k USD max, whichever is smaller
        const maxSize = reserve.tvl > 0 ? Math.min(reserve.tvl * 0.0005, 10000) : 2000;

        opportunities.push({
          asset: reserve.asset,
          aaveBorrowApy: reserve.borrowApy,
          aaveSupplyApy: reserve.supplyApy,
          hyperliquidFundingApy: fundingApy,
          direction: "SHORT_PERP_BORROW",
          spread,
          risk: spread > 20 ? "LOW" : spread > 10 ? "MEDIUM" : "HIGH",
          maxPositionSize: maxSize,
          explanation:
            `Borrow ${reserve.asset} at ${reserve.borrowApy.toFixed(2)}% APY on Aave V3 (X Layer). ` +
            `Short ${hlCoin}-PERP on Hyperliquid. Earn ${fundingApy.toFixed(2)}% annualized funding. ` +
            `Net spread: ${spread.toFixed(2)}% APY. TVL: $${(reserve.tvl / 1e6).toFixed(2)}M.`,
        });
      }

      // Scenario B: Negative funding (shorts pay longs) > supply APY
      // Action: Supply on Aave, long perp, collect funding
      // Only trade if spread is > 5% (minimum profitability threshold)
      if (fundingApy < 0 && Math.abs(fundingApy) > reserve.supplyApy) {
        const spread = Math.abs(fundingApy) - reserve.supplyApy;
        if (spread < 5) continue; // Skip thin spreads
        
        // Conservative: 0.05% of reserve or $10k USD max, whichever is smaller
        const maxSize = reserve.tvl > 0 ? Math.min(reserve.tvl * 0.0005, 10000) : 2000;

        opportunities.push({
          asset: reserve.asset,
          aaveBorrowApy: reserve.borrowApy,
          aaveSupplyApy: reserve.supplyApy,
          hyperliquidFundingApy: Math.abs(fundingApy),
          direction: "LONG_PERP_SUPPLY",
          spread,
          risk: spread > 20 ? "LOW" : spread > 10 ? "MEDIUM" : "HIGH",
          maxPositionSize: maxSize,
          explanation:
            `Supply ${reserve.asset} at ${reserve.supplyApy.toFixed(2)}% APY on Aave V3 (X Layer). ` +
            `Long ${hlCoin}-PERP on Hyperliquid. Earn ${Math.abs(fundingApy).toFixed(2)}% annualized funding. ` +
            `Net spread: ${spread.toFixed(2)}% APY.`,
        });
      }
    } catch (err: any) {
      // Skip assets that fail Hyperliquid lookup
      continue;
    }
  }

  // Sort by spread descending (best opportunities first)
  return opportunities.sort((a, b) => b.spread - a.spread);
}

// ── Get Aave Reserves (for standalone queries) ──

export async function getAaveReserves(): Promise<ParsedAaveReserve[]> {
  const rawReserves = await onchainOS.getAaveReserves();
  return rawReserves
    .map(parseAaveReserve)
    .filter((r): r is ParsedAaveReserve => r !== null);
}

// ── Deep Risk Analysis ──

export async function analyzeArbOpportunity(
  asset: string,
  direction: string
): Promise<ArbRiskAnalysis> {
  const baseRisks = [
    "Funding rate reversal — Hyperliquid rates reset every 8 hours and can flip direction",
    "Aave borrow rate spike — utilization-driven increases can compress or eliminate spread",
    "Basis risk — perpetual price may diverge from spot, creating unrealized PnL",
    "Liquidation cascade — correlated liquidations in Aave or Hyperliquid can affect both positions",
  ];

  const directionSpecificRisks: Record<string, string[]> = {
    SHORT_PERP_BORROW: [
      "Short squeeze risk — if spot rallies, short perp loses while borrowed asset appreciates",
      "Aave liquidation — if collateral drops, position may be liquidated before arb closes",
    ],
    LONG_PERP_SUPPLY: [
      "Long squeeze risk — if spot drops, long perp loses while supplied asset depreciates",
      "Smart contract risk — Aave pool or Hyperliquid contract exploit",
    ],
  };

  const allRisks = [
    ...baseRisks,
    ...(directionSpecificRisks[direction] || []),
  ];

  return {
    asset,
    direction,
    maxLeverage: 3,
    recommendedSize: "Start with 1000-5000 USD to test funding consistency",
    liquidationBuffer: "Maintain 15% buffer above Aave liquidation threshold and 20% above Hyperliquid maintenance margin",
    risks: allRisks,
    hedgeRecommendation:
      direction === "SHORT_PERP_BORROW"
        ? "Delta-neutral: Borrow exact amount = perp short size. Monitor basis every 4 hours."
        : "Delta-neutral: Supply exact amount = perp long size. Monitor basis every 4 hours.",
  };
}
