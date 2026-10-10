# TrenchCreep (Woody Bot) - Solana Memecoin Risk Screener

A Vercel-deployable Next.js (App Router, TypeScript) risk intelligence engine and screener that crawls newly created and recently migrated [pump.fun](https://pump.fun) tokens, traces on-chain holder lineages via Helius Enhanced Transactions, analyzes same-slot/bundled snipes, audits deployer historical behavior, and confirms security signals across RugCheck, DexScreener, and GMGN.

> **DISCLAIMER:** *Screening aid only. No trading, no wallet connect, no private keys. Passing checks does not guarantee safety. Memecoins carry extreme financial and technical risk.*

---

## 🏗 Architecture Overview

TrenchCreep operates as a serverless pipeline optimized for the Vercel Edge/Serverless runtime with strict request budgets:

```
                  ┌────────────────────────────────────────┐
                  │          DISCOVERY ADAPTERS            │
                  │   • pump.fun frontend API (live)       │
                  │   • DexScreener tokens/boosts fallback │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │       VERCEL KV / UPSTASH REDIS        │
                  │   • Seen mints deduplication           │
                  │   • 30-60s cached audit snapshots      │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │            4 PARALLEL AUDIT HEURISTICS                 │
        │                                                        │
        │  [Check A] Holder Funding Trace (Helius 3-hop graph)   │
        │  [Check B] Deployer Serial-Rug History (RugCheck)      │
        │  [Check C] Same-Slot / Bundled Buys (0-2 slot delta)   │
        │  [Check D] Multi-Source Confirmation (GMGN/DexScreen)  │
        └────────────────────────────┬───────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │                 WEIGHTED RISK SCORING                  │
        │    Total Score: 0 - 100  (Higher = Lower Risk)          │
        │    Verdicts: 'Avoid' | 'Caution' | 'Looks cleaner'     │
        └────────────────────────────┬───────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │              NEXT.JS APP ROUTER FRONTEND               │
        │   • Dashboard: Real-time feed with 30s auto-polling    │
        │   • Filters: Min Score, Hide Fails, Trending, Migrated │
        │   • Token Audit Page: Cluster graph & evidence breakdown│
        │   • Manual Mint Search: On-demand audit pipeline       │
        └────────────────────────────────────────────────────────┘
```

---

## 🔍 The 4 Core Checks & Failure Modes

Each check runs in parallel with a strict 4.5s timeout budget, returning `{ status: 'pass' | 'warn' | 'fail', score: 0-100, evidence: [] }`.

### Check A: Holder Funding Trace & Cluster Analysis
* **Mechanism:**
  * Retrieves top 20 non-excluded token holders (excluding the bonding curve, Raydium AMM pools, and known exchange programs).
  * Walks back the funding source of each holder's SOL wallet up to 3 hops using the Helius Enhanced Transactions API.
  * Discovers clusters where multiple independent holder wallets trace back to the exact same parent funder, fresh wallets funded in the exact same minute (< 60s), or funding sourced directly from the deployer or CEX hot wallets.
  * Measures the aggregate % of token supply controlled by each funder cluster.
* **Weights:** 35% of total score.
* **Limits & Edge Cases:**
  * **False Positive:** Legitimate community members who withdrew SOL from the same centralized exchange (e.g. Binance/Coinbase hot wallet) within the same withdrawal wave. Handled by detecting known exchange hot wallets and labeling them as CEX routing rather than malicious insider clusters.
  * **False Negative:** Sophisticated syndicates that fund sniper wallets via Tornado Cash/cross-chain bridges, separate privacy mixers, or aged wallets funded months prior.

---

### Check B: Deployer Historical Audit
* **Mechanism:**
  * Pulls the mint creation transaction to isolate the original creator/deployer public key.
  * Evaluates deployer wallet history: prior tokens deployed, count of dead coins (liquidity removed or price plummeting >90% within 24 hours of launch), and whether the deployer dumped their own supply within the initial bonding curve.
  * Cross-references against the public RugCheck.xyz security API to inspect mint authority, freeze authority status, and LP lock verification.
  * Fails immediately if the wallet exhibits serial-rugger behavior.
* **Weights:** 30% of total score.
* **Limits & Edge Cases:**
  * **False Positive:** Inexperienced developers whose initial legitimate projects failed due to organic market conditions rather than malicious rug pulls.
  * **False Negative:** Fresh burner deployer wallets funded through non-linked intermediate hops for each individual launch ("disposable deployers").

---

### Check C: Same-Slot / Bundled Buys Analysis
* **Mechanism:**
  * Resolves the exact slot of token creation (and of Raydium pool migration when graduated).
  * Audits all buy transactions landing in the **same slot** (delta = 0) or the **next 1-2 slots** (delta = 1 or 2).
  * Flags MEV/Jito bundle accumulation where the dev or coordinated snipers secure a dominant percentage of supply before retail can interact.
  * Computes total supply sniped in slots [0..2] and cross-matches shared funders among snipers.
* **Weights:** 25% of total score.
* **Limits & Edge Cases:**
  * **False Positive:** Competitive public MEV bots racing on popular hyped tickers that immediately sell into the curve rather than holding as malicious insiders.
  * **False Negative:** Insiders who strategically stagger buys over slots 5–20 with random priority fees to circumvent same-slot heuristics.

---

### Check D: Multi-Source Confirmation Layer
* **Mechanism:**
  * Uses an adapter pattern to query external intelligence sources:
    * **RugCheck.xyz:** Mint authority disabled, freeze authority disabled, LP burned/locked.
    * **DexScreener:** Active community boosts, search trend rankings, 24h volume.
    * **GMGN (Optional via `GMGN_ENABLED=true`):** Smart-money inflow tracking, sniper detection, security report.
  * Displays source consensus in the UI (`Agree`, `Neutral`, or `Disagree`). If GMGN is cloudflare-blocked or disabled, it is gracefully bypassed with a UI indicator without stalling the pipeline.
* **Weights:** 10% of total score.

---

## 📊 Scoring System & Plain-Language Verdicts

The total risk score is calculated via the weighted formula:

$$\text{Score} = (0.35 \times \text{HolderTrace}) + (0.30 \times \text{DeployerCheck}) + (0.25 \times \text{SameSlotBuys}) + (0.10 \times \text{Confirmation})$$

### Risk Verdict Bands:
* 🟢 **Looks cleaner (70 - 100):** Organic holder distribution, clean deployer history, no coordinated same-slot supply capture.
* 🟡 **Caution (40 - 69):** Moderate holder clustering (>15% supply), unverified genesis parameters, or early snipers detected.
* 🔴 **Avoid (0 - 39):** Heavy insider clusters (>25% supply), serial rug deployer, same-slot bundle snipes, or active freeze authority.
* **Hard Caps:** If any critical check scores $\le 20$, the overall score is strictly capped at **38/100 (Avoid)** regardless of other check scores.

---

## 🚀 Environment Variables Setup

Create a `.env.local` file in your project root based on `.env.example`:

```bash
# Helius RPC & Enhanced Transactions (Free tier at https://dev.helius.xyz)
HELIUS_API_KEY=your_helius_api_key_here

# Vercel KV or Upstash Redis (https://console.upstash.com or Vercel Storage)
KV_REST_API_URL=https://your-database.upstash.io
KV_REST_API_TOKEN=your_upstash_rest_token

# Multi-Layer Confirmation Adapters
GMGN_ENABLED=false

# Optional Vercel Cron Security Token
CRON_SECRET=your_random_secret_token
```

> **Note:** If `KV_REST_API_URL` is omitted, TrenchCreep automatically falls back to high-performance in-memory caching during local development.

---

## 🧪 Running Unit Tests

Unit tests verify the holder clustering heuristics and same-slot sniper math using static fixture data:

```bash
# Run unit tests
npm test
```

Test coverage includes:
* Multiple holder wallets linked to single root funder.
* Batch same-minute funding detection (< 60 seconds).
* CEX hot wallet masking detection.
* Direct deployer-funded wallet detection.
* Slot 0 creation buy capture.
* Cumulative supply sniped across slot 0, +1, and +2.
* Exclusion of legitimate organic buys landing after slot 2.

---

## 🚢 GitHub Push Steps

To push your updates to the remote GitHub repository (`nativedreamer/TrenchCreep`):

```bash
# 1. Check status
git status

# 2. Stage all files
git add .

# 3. Commit changes
git commit -m "feat: complete Woody Bot Solana memecoin screener with 4-check audit and Next.js App Router"

# 4. Push to main branch
git push origin main
```

---

## ⚡ Vercel Import & Deployment Steps

1. **Import Repository in Vercel:**
   * Go to [Vercel Dashboard](https://vercel.com/new).
   * Select `nativedreamer/TrenchCreep`.
   * Framework Preset: **Next.js**.
   * Root Directory: `./`.

2. **Configure Environment Variables:**
   * In Vercel Project Settings $\rightarrow$ Environment Variables:
     * Add `HELIUS_API_KEY`
     * Add `KV_REST_API_URL`
     * Add `KV_REST_API_TOKEN`
     * Add `GMGN_ENABLED` (`false` by default)
     * Add `CRON_SECRET`

3. **Deploy:**
   * Click **Deploy**. Vercel will automatically build the Next.js App Router application.
   * Vercel Cron is configured in `vercel.json` to trigger `/api/cron/scan` every 5 minutes to pre-audit new tokens and keep the feed cache warm.

---

## 📜 License

MIT License. Built for crypto researchers and trench screeners.
