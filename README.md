# X Layer Funding Arbitrage Radar

> Detect risk-free yield by comparing Hyperliquid perpetual funding rates against Aave V3 borrow costs on X Layer (OKX zkEVM, Chain ID: 196).

## What It Does

This agent skill scans for **funding rate arbitrage** — a cross-protocol yield strategy no existing plugin covers:

- **Hyperliquid ETH-PERP**: +0.03%/8h funding = **32.85% APY**
- **Aave V3 ETH borrow**: 0.01%/8h = **8.76% APY**
- **Arb**: Borrow ETH on Aave → Short ETH-PERP → Collect **24.09% net spread**

## Architecture

```
User Query → Agent Tools → onchainOS CLI (PRIMARY) → Aave V3 Data
                                    ↓
                            Hyperliquid API (Supplemental) → Perp Funding
                                    ↓
                            Arb Engine → Spread Detection → Risk Analysis
```

## Data Sources

| Source | Role | Method |
|--------|------|--------|
| **onchainOS** | **PRIMARY** | `onchainos defi search` for Aave V3 |
| **onchainOS** | **PRIMARY** | `onchainos market price` for token prices |
| **Hyperliquid API** | Supplemental | Direct REST API for perp funding rates |

## Tools

| Tool | Description |
|------|-------------|
| `scan_funding_arbitrage` | Scan all markets for arb opportunities |
| `get_aave_reserves` | Aave V3 reserve overview on X Layer |
| `analyze_arb_opportunity` | Deep risk analysis for specific trade |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your OKX API credentials

# 3. Install onchainOS CLI
curl -sSL https://raw.githubusercontent.com/okx/onchainos-skills/main/install.sh | sh

# 4. Run dev server
npm run dev

# Server starts at http://localhost:3000
# GET  /health      — Health check
# GET  /agent.json  — Agent Card
# GET  /tools       — List capabilities
# POST /execute     — Run a tool
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OKX_API_KEY` | Yes | OKX API key for onchainOS |
| `OKX_SECRET_KEY` | Yes | OKX secret key |
| `OKX_PASSPHRASE` | Yes | OKX passphrase |
| `PORT` | No | Server port (default: 3000) |
| `XLAYER_RPC_URL` | No | Custom RPC fallback |

## X Layer Context

- **Chain ID**: 196
- **Native Token**: OKB
- **Aave V3**: Active since March 2026
- **Tokens**: WETH, USDC, USDT, WBTC, DAI

## License

MIT
