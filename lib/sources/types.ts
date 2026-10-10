import { TokenInfo } from '../types';

export interface TokenSourceAdapter {
  name: string;
  getNewTokens(limit?: number): Promise<TokenInfo[]>;
  getMigratedTokens(limit?: number): Promise<TokenInfo[]>;
  getTokenByMint(mint: string): Promise<TokenInfo | null>;
}
