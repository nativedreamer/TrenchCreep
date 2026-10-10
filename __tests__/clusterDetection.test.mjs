import test from 'node:test';
import assert from 'node:assert/strict';

// Fixture data representing holders and their traced funding sources
const FIXTURE_HOLDERS = [
  { address: 'WalletA111111111111111111111111111111111111', pctOfSupply: 6.5 },
  { address: 'WalletA222222222222222222222222222222222222', pctOfSupply: 5.8 },
  { address: 'WalletA333333333333333333333333333333333333', pctOfSupply: 4.2 },
  { address: 'WalletB111111111111111111111111111111111111', pctOfSupply: 3.1 },
  { address: 'WalletC111111111111111111111111111111111111', pctOfSupply: 1.5 },
];

const FIXTURE_TRACES = {
  // Wallets A1, A2, A3 all trace to RootFunderAlpha (Cluster!)
  'WalletA111111111111111111111111111111111111': {
    funder: 'RootFunderAlpha9999999999999999999999999999',
    fundingTimestamp: 1712000000000,
    hopCount: 2,
    isCex: false,
  },
  'WalletA222222222222222222222222222222222222': {
    funder: 'RootFunderAlpha9999999999999999999999999999',
    fundingTimestamp: 1712000025000, // funded within 25 seconds of A1!
    hopCount: 2,
    isCex: false,
  },
  'WalletA333333333333333333333333333333333333': {
    funder: 'RootFunderAlpha9999999999999999999999999999',
    fundingTimestamp: 1712000045000,
    hopCount: 1,
    isCex: false,
  },
  // Wallet B traces to a CEX hot wallet
  'WalletB111111111111111111111111111111111111': {
    funder: '5tzFkiKscBiz8699HL75286596',
    fundingTimestamp: 1711900000000,
    hopCount: 1,
    isCex: true,
    cexName: 'Binance',
  },
  // Wallet C is independent
  'WalletC111111111111111111111111111111111111': {
    funder: 'IndependentFunderZZZZZZZZZZZZZZZZZZZZZZZZZ',
    fundingTimestamp: 1711800000000,
    hopCount: 1,
    isCex: false,
  },
};

function detectClusters(holders, traces, deployerAddress) {
  const clusterMap = new Map();

  for (const h of holders) {
    const trace = traces[h.address];
    if (!trace) continue;

    const funder = trace.funder;
    if (!clusterMap.has(funder)) {
      clusterMap.set(funder, {
        funder,
        isCex: trace.isCex,
        cexName: trace.cexName,
        isDeployer: Boolean(deployerAddress && funder.toLowerCase() === deployerAddress.toLowerCase()),
        wallets: [],
        totalSupplyPct: 0,
        timestamps: [],
      });
    }

    const cluster = clusterMap.get(funder);
    cluster.wallets.push(h.address);
    cluster.totalSupplyPct += h.pctOfSupply;
    if (trace.fundingTimestamp) cluster.timestamps.push(trace.fundingTimestamp);
  }

  const clusters = Array.from(clusterMap.values());
  const multiWalletClusters = clusters.filter((c) => c.wallets.length > 1);

  return { clusters, multiWalletClusters };
}

test('Holder Funding Trace - Cluster Detection Logic', async (t) => {
  await t.test('detects multiple holders linked to single root funder', () => {
    const { multiWalletClusters } = detectClusters(
      FIXTURE_HOLDERS,
      FIXTURE_TRACES,
      'DeployerWalletTestAddress11111111111111111'
    );

    assert.equal(multiWalletClusters.length, 1);
    const alphaCluster = multiWalletClusters[0];
    assert.equal(alphaCluster.funder, 'RootFunderAlpha9999999999999999999999999999');
    assert.equal(alphaCluster.wallets.length, 3);
    assert.ok(Math.abs(alphaCluster.totalSupplyPct - 16.5) < 0.01, 'Cluster should hold ~16.5% of supply');
  });

  await t.test('flags batch same-minute funding window', () => {
    const { multiWalletClusters } = detectClusters(
      FIXTURE_HOLDERS,
      FIXTURE_TRACES,
      'DeployerWalletTestAddress11111111111111111'
    );

    const cluster = multiWalletClusters[0];
    const sorted = [...cluster.timestamps].sort();
    const spanMs = sorted[sorted.length - 1] - sorted[0];

    // All 3 were funded within 45 seconds (< 60,000 ms)
    assert.ok(spanMs <= 60_000, 'Wallets funded in the same minute');
  });

  await t.test('detects CEX hot wallet masking source', () => {
    const { clusters } = detectClusters(
      FIXTURE_HOLDERS,
      FIXTURE_TRACES,
      'DeployerWalletTestAddress11111111111111111'
    );

    const cexCluster = clusters.find((c) => c.isCex);
    assert.ok(cexCluster, 'Should flag CEX source');
    assert.equal(cexCluster.cexName, 'Binance');
  });

  await t.test('flags deployer-funded wallet directly', () => {
    const deployerAddress = 'RootFunderAlpha9999999999999999999999999999';
    const { clusters } = detectClusters(FIXTURE_HOLDERS, FIXTURE_TRACES, deployerAddress);

    const deployerCluster = clusters.find((c) => c.isDeployer);
    assert.ok(deployerCluster, 'Should flag deployer-funded cluster');
    assert.equal(deployerCluster.wallets.length, 3);
  });
});
