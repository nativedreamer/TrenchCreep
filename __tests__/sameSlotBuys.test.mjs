import test from 'node:test';
import assert from 'node:assert/strict';

// Fixture data representing genesis creation slot and early block transactions
const CREATION_SLOT = 250_000_100;

const FIXTURE_TRANSACTIONS = [
  // Block 0 (Same Slot - Bundled Buys)
  { slot: 250_000_100, wallet: 'SniperBundle11111111111111111111111111111', amountPct: 6.2 },
  { slot: 250_000_100, wallet: 'SniperBundle22222222222222222222222222222', amountPct: 5.5 },
  { slot: 250_000_100, wallet: 'SniperBundle33333333333333333333333333333', amountPct: 4.8 },

  // Block +1 (Next Slot)
  { slot: 250_000_101, wallet: 'FastBuyerAAAA1111111111111111111111111111', amountPct: 3.2 },

  // Block +2 (Next 2 Slots)
  { slot: 250_000_102, wallet: 'FastBuyerBBBB1111111111111111111111111111', amountPct: 2.1 },

  // Block +5 (Normal Organic Buy)
  { slot: 250_000_105, wallet: 'OrganicBuyerCCCC1111111111111111111111111', amountPct: 1.0 },
];

function analyzeSlotBuys(creationSlot, transactions) {
  const slotMap = new Map();
  const targetSlots = new Set([creationSlot, creationSlot + 1, creationSlot + 2]);

  let totalSnipedPct = 0;
  let sameSlotCount = 0;

  for (const tx of transactions) {
    if (!targetSlots.has(tx.slot)) continue;

    const delta = tx.slot - creationSlot;
    totalSnipedPct += tx.amountPct;
    if (delta === 0) sameSlotCount++;

    if (!slotMap.has(tx.slot)) {
      slotMap.set(tx.slot, { slot: tx.slot, deltaSlots: delta, wallets: [], supplyPct: 0 });
    }
    const group = slotMap.get(tx.slot);
    group.wallets.push(tx.wallet);
    group.supplyPct += tx.amountPct;
  }

  const groups = Array.from(slotMap.values()).sort((a, b) => a.deltaSlots - b.deltaSlots);

  return {
    creationSlot,
    sameSlotCount,
    totalSnipedPct: Number(totalSnipedPct.toFixed(2)),
    groups,
    isBundleDetected: sameSlotCount >= 3,
  };
}

test('Same-Slot & Bundled Buys Analysis', async (t) => {
  await t.test('detects transactions landing in exact creation slot (slot 0)', () => {
    const result = analyzeSlotBuys(CREATION_SLOT, FIXTURE_TRANSACTIONS);

    assert.equal(result.sameSlotCount, 3);
    assert.equal(result.isBundleDetected, true, '3 same-slot buys should trigger bundle flag');

    const slot0Group = result.groups.find((g) => g.deltaSlots === 0);
    assert.ok(slot0Group);
    assert.equal(slot0Group.wallets.length, 3);
    assert.ok(Math.abs(slot0Group.supplyPct - 16.5) < 0.01);
  });

  await t.test('calculates cumulative supply sniped across slot 0, +1, and +2', () => {
    const result = analyzeSlotBuys(CREATION_SLOT, FIXTURE_TRANSACTIONS);

    // Slot 0 (16.5) + Slot 1 (3.2) + Slot 2 (2.1) = 21.8%
    assert.ok(Math.abs(result.totalSnipedPct - 21.8) < 0.01, 'Cumulative sniped supply should be ~21.8%');
  });

  await t.test('ignores trades occurring after slot 2', () => {
    const result = analyzeSlotBuys(CREATION_SLOT, FIXTURE_TRANSACTIONS);

    const hasSlot5 = result.groups.some((g) => g.deltaSlots === 5);
    assert.equal(hasSlot5, false, 'Trades at slot delta > 2 should not be counted as sniper window');
  });
});
