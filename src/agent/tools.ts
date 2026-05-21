/**
 * Agent Tool Definitions — The AI-facing interface.
 *
 * Each tool has a name, description, JSON Schema parameters, and a handler.
 * Compatible with A2A protocol and OpenAI function calling.
 */

import * as arbService from "../services/arb";

export interface ToolDef {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

export const tools: ToolDef[] = [
  {
    name: "scan_funding_arbitrage",
    description:
      "Scans all supported markets for funding rate arbitrage opportunities on X Layer. Compares Hyperliquid perpetual funding rates against Aave V3 borrow costs. Returns ranked opportunities with spread, direction, risk level, and sizing recommendations. Uses onchainOS as the primary data source for Aave V3 lending data.",
    category: "strategy",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const opportunities = await arbService.scanFundingArbitrage();
      const summary =
        opportunities.length > 0
          ? `Found ${opportunities.length} funding arb opportunities. Best: ${opportunities[0].asset} at ${opportunities[0].spread.toFixed(2)}% APY spread.`
          : "No funding arbitrage opportunities found currently. Funding rates may be balanced or Aave rates too high.";

      return {
        opportunities,
        summary,
        scannedAt: new Date().toISOString(),
        dataSource: "onchainOS (Aave) + Hyperliquid API (Perps)",
      };
    },
  },

  {
    name: "get_aave_reserves",
    description:
      "Returns all Aave V3 reserves on X Layer with supply APY, borrow APY, utilization rate, and TVL. Uses onchainOS as the primary data source. Useful for understanding lending rates before evaluating arbitrage opportunities.",
    category: "lending",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const reserves = await arbService.getAaveReserves();
      return {
        reserves,
        count: reserves.length,
        chain: "X Layer",
        chainId: 196,
        dataSource: "onchainOS",
      };
    },
  },

  {
    name: "analyze_arb_opportunity",
    description:
      "Deep risk analysis of a specific funding arbitrage opportunity. Returns position sizing, leverage limits, liquidation thresholds, and risk factors. Use after scan_funding_arbitrage to evaluate a specific trade before execution.",
    category: "strategy",
    parameters: {
      type: "object",
      properties: {
        asset: {
          type: "string",
          description: "Asset symbol to analyze (e.g. 'ETH', 'BTC', 'SOL')",
        },
        direction: {
          type: "string",
          enum: ["SHORT_PERP_BORROW", "LONG_PERP_SUPPLY"],
          description: "Arbitrage direction from scan results",
        },
      },
      required: ["asset", "direction"],
    },
    handler: async (params: any) => {
      const analysis = await arbService.analyzeArbOpportunity(
        params.asset,
        params.direction
      );
      return analysis;
    },
  },
];

export function getTool(name: string): ToolDef | undefined {
  return tools.find((t) => t.name === name);
}

export function getToolsByCategory(category: string): ToolDef[] {
  return tools.filter((t) => t.category === category);
}
