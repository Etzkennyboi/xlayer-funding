/**
 * Viem Client — Fallback for direct RPC calls.
 *
 * PRIMARY data source is onchainOS CLI. This client is only used when
 * onchainOS is unavailable or for operations not yet supported by onchainOS.
 */

import { createPublicClient, http, type PublicClient, type Chain } from "viem";
import { xLayer, xLayerTestnet, type SupportedChain } from "../config/chains";

export function getPublicClient(chain: SupportedChain = xLayer): PublicClient {
  return createPublicClient({
    chain: {
      id: chain.id,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: {
        default: { http: [chain.rpcUrl] },
        public: { http: [chain.rpcUrl] },
      },
    } as Chain,
    transport: http(),
  });
}

export function getChainConfig(chainId: number): SupportedChain {
  if (chainId === 196) return xLayer;
  if (chainId === 195) return xLayerTestnet;
  return xLayer;
}
