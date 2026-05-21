/**
 * X Layer Chain Configuration
 *
 * Chain ID: 196
 * Type: zkEVM L2
 * Native Token: OKB
 */

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const xLayer: ChainConfig = {
  id: 196,
  name: "X Layer",
  rpcUrl: process.env.XLAYER_RPC_URL || "https://xlayer.drpc.org",
  explorerUrl: "https://www.oklink.com/xlayer",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
};

export const xLayerTestnet: ChainConfig = {
  id: 195,
  name: "X Layer Testnet",
  rpcUrl: process.env.XLAYER_TESTNET_RPC_URL || "https://testrpc.xlayer.tech",
  explorerUrl: "https://www.oklink.com/xlayer-testnet",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
};

export type SupportedChain = typeof xLayer | typeof xLayerTestnet;
