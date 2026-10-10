import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'DegenTrench - Memecoin Radar & Crawler',
  description: 'High-speed memecoin audit, live web crawler, bonding curve radar, and risk intelligence terminal for crypto trench trading.',
  openGraph: {
    title: 'DegenTrench - Memecoin Radar & Crawler',
    description: 'High-speed memecoin audit, live web crawler, bonding curve radar, and risk intelligence terminal for crypto trench trading.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#070a12] text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
