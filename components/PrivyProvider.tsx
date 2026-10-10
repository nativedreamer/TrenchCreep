'use client';

import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

interface Props {
  children: React.ReactNode;
}

/**
 * Authentication-only Privy shell.
 *
 * This app intentionally does not request, export, store, or submit signed
 * transactions. The embedded wallet is used only to expose a public address
 * for the proposal-only control plane.
 */
export default function PrivyAuthProvider({ children }: Props) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;

  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
          solana: { createOnLogin: 'users-without-wallets' },
          showWalletUIs: true,
        },
        loginMethods: ['email', 'google', 'twitter', 'wallet'],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
