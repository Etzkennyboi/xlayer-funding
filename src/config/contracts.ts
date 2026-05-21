/**
 * X Layer Contract Addresses
 *
 * PancakeSwap V3: Same contract addresses across all EVM chains (BSC, ETH, ARB, Base, X Layer)
 * Aave V3: Deployed on X Layer March 2026 — verify actual addresses on oklink.com/xlayer
 *
 * Chain ID: 196
 * Explorer: https://www.oklink.com/xlayer
 */

// ── PancakeSwap V3 (Verified: same across all chains) ──
export const PANCAKESWAP_V3 = {
  factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865" as `0x${string}`,
  swapRouter: "0x1b81D678ffb9C0263b24A97847620C99d213eB14" as `0x${string}`,
  quoterV2: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997" as `0x${string}`,
  positionManager: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364" as `0x${string}`,
};

// ── Aave V3 (Deployed March 2026 on X Layer) ──
// Addresses from https://docs.aave.com/deployed-contracts-3 (X Layer section)
// NOTE: Use onchainOS CLI as PRIMARY source. These fallbacks are for direct RPC only.
export const AAVE_V3 = {
  pool: "0x622e47DfBb2d92548FC3e52a486d6B9ba7Dd20f9" as `0x${string}`,
  poolDataProvider: "0x69FA688f1Dc247d0D45EB5D8134df76294e80e02" as `0x${string}`,
  oracle: "0xEc9b2c77d63316e6f25aA32E206Bfb5E6Ef07570" as `0x${string}`,
};

// ── ERC20 Minimal ABI ──
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ── PancakeSwap V3 QuoterV2 ABI ──
export const QUOTER_V2_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

// ── PancakeSwap V3 SwapRouter ABI ──
export const SWAP_ROUTER_ABI = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;
