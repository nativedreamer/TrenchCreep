'use client';

import React, { useEffect } from 'react';
import { LogIn, LogOut, Wallet } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

interface Props {
  onConnect: (address: string, balanceSol?: number) => void;
  onDisconnect: () => void;
}

/** Authentication and public-address display only; no signing or sending APIs are called. */
export default function PrivySessionButton({ onConnect, onDisconnect }: Props) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  useEffect(() => {
    if (ready && authenticated && wallet?.address) {
      onConnect(wallet.address, 0);
    }
    if (ready && !authenticated) onDisconnect();
  }, [ready, authenticated, wallet?.address, onConnect, onDisconnect]);

  if (!ready) return <span className="text-[10px] text-slate-500">Initializing Privy…</span>;

  if (!authenticated) {
    return (
      <button type="button" onClick={() => login()} className="flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2.5 py-2 text-[10px] font-bold text-cyan-300">
        <LogIn className="h-3 w-3" /> Login with Privy
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Wallet className="h-4 w-4 text-emerald-300" />
      <span className="font-mono text-[10px] text-emerald-300">
        {wallet?.address ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-6)}` : 'Authenticated'}
      </span>
      <button type="button" onClick={() => logout()} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-slate-300">
        <LogOut className="h-3 w-3" /> Logout
      </button>
    </div>
  );
}
