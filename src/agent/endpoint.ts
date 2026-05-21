/**
 * Agent HTTP Endpoint — A2A-compatible agent server.
 *
 * Routes:
 *   GET  /health      — Health check
 *   GET  /agent.json  — Agent Card (A2A discovery)
 *   GET  /tools       — List all available tools
 *   POST /execute     — Execute a tool: { tool: string, params: object }
 */

import express from "express";
import { tools, getTool } from "./tools";

export function createServer() {
  const app = express();
  app.use(express.json());
  
  // ── CORS Headers ──
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
  
  // ── Request Timeout (30s) ──
  app.use((req, res, next) => {
    req.setTimeout(30000);
    res.setTimeout(30000);
    next();
  });

  // ── Health Check ──
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      agent: "xlayer-funding-arb-radar",
      version: "1.0.0",
      chain: "X Layer",
      chainId: 196,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Agent Card (A2A / ERC-8004 compatible) ──
  app.get("/agent.json", (_req, res) => {
    res.json({
      name: "X Layer Funding Arbitrage Radar",
      description:
        "Detects risk-free yield by comparing Hyperliquid perpetual funding rates against Aave V3 borrow costs on X Layer. Uses onchainOS as the primary data source for all lending data. Provides cross-protocol arbitrage detection, risk assessment, and position sizing recommendations.",
      version: "1.0.0",
      capabilities: [
        "funding_arbitrage_scan",
        "aave_reserve_query",
        "arb_risk_analysis",
        "cross_protocol_yield",
      ],
      protocols: ["Aave V3", "Hyperliquid"],
      chain: "X Layer",
      chainId: 196,
      interfaces: {
        tools: "/tools",
        execute: "/execute",
        health: "/health",
      },
      dataSource: "onchainOS",
    });
  });

  // ── List Tools ──
  app.get("/tools", (_req, res) => {
    const toolList = tools.map((t) => ({
      name: t.name,
      description: t.description,
      category: t.category,
      parameters: t.parameters,
    }));
    res.json({ tools: toolList, count: toolList.length });
  });

  // ── Execute Tool ──
  app.post("/execute", async (req, res) => {
    const { tool: toolName, params } = req.body;

    if (!toolName) {
      return res.status(400).json({ error: "Missing 'tool' field" });
    }

    const tool = getTool(toolName);
    if (!tool) {
      return res.status(404).json({
        error: `Unknown tool: ${toolName}`,
        available: tools.map((t) => t.name),
      });
    }

    try {
      const startTime = Date.now();
      const result = await tool.handler(params || {});
      const durationMs = Date.now() - startTime;

      res.json({
        tool: toolName,
        result,
        meta: {
          durationMs,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      res.status(500).json({
        error: err.message || "Tool execution failed",
        tool: toolName,
      });
    }
  });

  return app;
}
