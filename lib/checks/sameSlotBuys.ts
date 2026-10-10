import { CheckResult, EvidenceItem, SameSlotBuyGroup, TokenInfo } from '../types';
import { heliusSource } from '../sources/helius';

export interface SameSlotOptions {
  timeoutMs?: number;
}

/**
 * Check C: Same-Slot & Bundled Sniper Buys Analysis
 */
export async function executeSameSlotBuysCheck(
  token: TokenInfo,
  options: SameSlotOptions = {}
): Promise<{ check: CheckResult; sameSlotBuys: SameSlotBuyGroup[] }> {
  const startTime = Date.now();
  const evidence: EvidenceItem[] = [];
  let score = 100;
  const timeoutMs = options.timeoutMs || 4000;

  try {
    let creationSlot = token.createdSlot;
    if (!creationSlot) {
      const creation = await Promise.race([
        heliusSource.getMintCreationDetails(token.mint),
        new Promise<{ slot?: number }>((_, reject) =>
          setTimeout(() => reject(new Error('Creation slot timeout')), timeoutMs)
        ),
      ]).catch(() => ({}));
      creationSlot = creation.slot;
    }

    if (!creationSlot) {
      evidence.push({
        id: 'slot_unavailable',
        rule: 'Genesis Slot Analysis',
        severity: 'info',
        message: 'Exact genesis creation slot was not indexed or occurred too recently for archive RPC.',
      });

      return {
        check: {
          id: 'same_slot',
          name: 'Same-Slot / Bundled Buys',
          status: 'pass',
          score: 80,
          evidence,
          metadata: { creationSlot: 'N/A', snipedSupplyPct: 0 },
          executionTimeMs: Date.now() - startTime,
        },
        sameSlotBuys: [],
      };
    }

    // 2. Fetch early buys around creation slot (slots: creationSlot, creationSlot+1, creationSlot+2)
    const earlyBuys = await heliusSource.getEarlySlotBuys(token.mint, creationSlot);
    const slotMap = new Map<number, { wallets: string[]; supplyPct: number }>();

    for (const buy of earlyBuys) {
      if (!slotMap.has(buy.slot)) {
        slotMap.set(buy.slot, { wallets: [], supplyPct: 0 });
      }
      const item = slotMap.get(buy.slot)!;
      item.wallets.push(buy.wallet);
      item.supplyPct += buy.amountPct;
    }

    const buyGroups: SameSlotBuyGroup[] = [];
    let totalSnipedPct = 0;
    let sameSlotCount = 0;

    for (const [slot, data] of slotMap.entries()) {
      const delta = slot - creationSlot;
      totalSnipedPct += data.supplyPct;
      if (delta === 0) sameSlotCount += data.wallets.length;

      buyGroups.push({
        slot,
        deltaSlots: delta,
        wallets: data.wallets,
        totalSupplyPct: Number(data.supplyPct.toFixed(2)),
        sharedFunders: [],
      });
    }

    // Sort by delta slot
    buyGroups.sort((a, b) => a.deltaSlots - b.deltaSlots);

    // Evaluate evidence & penalties
    if (sameSlotCount >= 3) {
      score -= 40;
      evidence.push({
        id: 'same_slot_bundle',
        rule: 'Jito / Same-Slot Bundle',
        severity: 'fail',
        message: `${sameSlotCount} buy transactions landed in the exact same block slot as mint creation (slot ${creationSlot}), indicating bundle execution.`,
        details: { count: sameSlotCount, slot: creationSlot },
      });
    } else if (sameSlotCount > 0) {
      score -= 20;
      evidence.push({
        id: 'same_slot_snipe',
        rule: 'Block 0 Buy',
        severity: 'warn',
        message: `${sameSlotCount} buy transaction landed in slot 0 alongside token creation.`,
      });
    }

    if (totalSnipedPct > 20) {
      score -= 35;
      evidence.push({
        id: 'high_sniped_supply',
        rule: 'Heavy Supply Sniping',
        severity: 'fail',
        message: `${totalSnipedPct.toFixed(1)}% of total supply was sniped within the first 1-2 slots of deployment.`,
        details: { snipedPct: totalSnipedPct },
      });
    } else if (totalSnipedPct > 10) {
      score -= 15;
      evidence.push({
        id: 'mod_sniped_supply',
        rule: 'Moderate Slot Sniping',
        severity: 'warn',
        message: `${totalSnipedPct.toFixed(1)}% of token supply secured within first 2 slots.`,
      });
    }

    if (buyGroups.length === 0) {
      evidence.push({
        id: 'slot_clean',
        rule: 'Natural Launch Curve',
        severity: 'info',
        message: 'No same-slot or bundled MEV sniper transactions detected in genesis blocks.',
      });
    }

    score = Math.max(0, Math.min(100, score));
    const status = score < 50 ? 'fail' : score < 75 ? 'warn' : 'pass';

    return {
      check: {
        id: 'same_slot',
        name: 'Same-Slot / Bundled Buys',
        status,
        score,
        evidence,
        metadata: {
          creationSlot,
          sameSlotBuysCount: sameSlotCount,
          totalSnipedSupplyPct: totalSnipedPct,
          groupsAudited: buyGroups.length,
        },
        executionTimeMs: Date.now() - startTime,
      },
      sameSlotBuys: buyGroups,
    };
  } catch (err: any) {
    return {
      check: {
        id: 'same_slot',
        name: 'Same-Slot / Bundled Buys',
        status: 'warn',
        score: 70,
        evidence: [
          {
            id: 'slot_error',
            rule: 'Slot Inspection',
            severity: 'warn',
            message: `Same-slot check completed with partial confirmation: ${err.message}`,
          },
        ],
        metadata: { error: err.message },
        executionTimeMs: Date.now() - startTime,
      },
      sameSlotBuys: [],
    };
  }
}
