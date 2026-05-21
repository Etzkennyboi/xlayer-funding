---
name: xlayer-funding-arb-radar
description: >
  Funding Rate Arbitrage Radar for X Layer (OKX zkEVM). Detects risk-free yield 
  opportunities by comparing Hyperliquid perpetual funding rates against Aave V3 
  borrow costs. Uses onchainOS as the primary data source for all Aave V3 lending 
  data. Use when user asks about funding rates, arbitrage, yield farming, perp 
  trading, earn yield on X Layer, best APY, risk-free strategies, or cross-protocol 
  opportunities between lending and perpetuals.
---

# X Layer Funding Arbitrage Radar

## What This Does

This skill detects **funding rate arbitrage** — a cross-protocol yield strategy 
that no existing plugin covers.

**The Math:**
- Hyperliquid ETH-PERP: +0.03%/8h funding = **32.85% APY** (longs pay shorts)
- Aave V3 ETH borrow: 0.01%/8h = **8.76% APY**
- **Arb:** Borrow ETH on Aave → Short ETH-PERP → Collect **24.09% net spread**

## How Arbitrage Works

**Scenario A — Positive Funding (Short Perp + Borrow):**
When perp funding is positive, longs pay shorts. If the funding rate exceeds 
Aave borrow cost, you can:
1. Borrow the asset on Aave V3 (pay borrow APY)
2. Short the perp on Hyperliquid (receive funding)
3. Net the spread

**Scenario B — Negative Funding (Long Perp + Supply):**
When perp funding is negative, shorts pay longs. If the absolute funding exceeds 
Aave supply APY, you can:
1. Supply the asset on Aave V3 (earn supply APY)
2. Long the perp on Hyperliquid (receive funding)
3. Net the spread

## Data Sources

| Source | Role | Method |
|--------|------|--------|
| **onchainOS** | **PRIMARY** | `onchainos defi search` for Aave V3 reserves |
| **Hyperliquid API** | Supplemental | Direct API for perp funding rates |
| **onchainOS** | **PRIMARY** | `onchainos market price` for token prices |

## X Layer Context

- **Chain ID**: 196
- **Native Token**: OKB
- **Aave V3**: Active on X Layer since March 2026
- **Tokens**: WETH, USDC, USDT, WBTC, DAI

## Tools

### 1. `scan_funding_arbitrage`

Scans all supported markets for funding rate arbitrage opportunities.

**Triggers:**
- "find funding arb"
- "scan for arbitrage"
- "best yield on X Layer"
- "risk-free strategies"
- "funding rate opportunities"
- "earn yield on perps"
- "compare Aave and Hyperliquid"

**Output:**
```json
{
  "opportunities": [
    {
      "asset": "ETH",
      "direction": "SHORT_PERP_BORROW",
      "aaveBorrowApy": 8.76,
      "hyperliquidFundingApy": 32.85,
      "spread": 24.09,
      "risk": "LOW",
      "explanation": "Borrow ETH at 8.76% on Aave V3. Short ETH-PERP on Hyperliquid. Earn 32.85% funding. Net: 24.09% APY."
    }
  ],
  "summary": "Found 3 opportunities. Best: ETH at 24.09% APY."
}
```

### 2. `get_aave_reserves`

Returns all Aave V3 reserves on X Layer with supply/borrow APYs.

**Triggers:**
- "Aave reserves"
- "lending rates on X Layer"
- "borrow costs"
- "supply APY"

### 3. `analyze_arb_opportunity`

Deep analysis of a specific funding arb opportunity.

**Triggers:**
- "analyze ETH arb"
- "risk breakdown for BTC funding"
- "position sizing for arbitrage"
- "liquidation risk on this trade"

**Parameters:**
- `asset` (string): Asset symbol (ETH, BTC, SOL, etc.)
- `direction` (string): "SHORT_PERP_BORROW" or "LONG_PERP_SUPPLY"

**Output:**
```json
{
  "asset": "ETH",
  "direction": "SHORT_PERP_BORROW",
  "maxLeverage": 3,
  "recommendedSize": "5000 USD",
  "liquidationBuffer": "15%",
  "risks": [
    "Funding rate reversal — rates change every 8 hours",
    "Aave borrow rate spike — utilization-driven",
    "Basis risk — perp price vs spot divergence"
  ],
  "hedgeRecommendation": "Maintain delta-neutral: borrow amount = perp position size"
}
```

## Principles

1. **onchainOS-first**: All Aave data flows through onchainOS CLI. No direct contract calls.
2. **Never auto-execute**: This skill only detects and analyzes. User decides to execute.
3. **Annualized APYs**: All rates converted to APY for fair comparison.
4. **Liquidation safety**: Max 3x leverage, 15% buffer recommended.
5. **Rate reversal warning**: Funding rates reset every 8 hours — monitor daily.
6. **Cross-protocol risk**: Aave health factor + perp margin must both stay safe.

## Risk Levels

| Spread | Risk | Action |
|--------|------|--------|
| > 20% APY | LOW | Viable arb, monitor funding |
| 10-20% APY | MEDIUM | Viable, tight stops recommended |
| 5-10% APY | HIGH | Thin margin, rate reversal wipes profit |
| < 5% APY | NO_ARB | Not worth gas + complexity |

## Example Conversation Flows

**User:** "Find me funding arbitrage on X Layer"
→ `scan_funding_arbitrage`
→ Show ranked opportunities
→ Suggest `analyze_arb_opportunity` for top pick

**User:** "Is ETH funding arb safe right now?"
→ `analyze_arb_opportunity` with asset="ETH", direction="SHORT_PERP_BORROW"
→ Show risk breakdown, sizing, liquidation thresholds

**User:** "What are Aave borrow rates?"
→ `get_aave_reserves`
→ Show all reserves with supply/borrow APYs
