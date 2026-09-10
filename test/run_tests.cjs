const { spawnSync } = require('child_process');
const path = require('path');

const testSuites = [
  'test/unit/PositionMath.test.ts',
  'test/unit/RiskEngine.test.ts',
  'test/unit/B20StateReader.test.ts',
  'test/integration/CorporateActionConservation.test.ts',
  'test/integration/B20MultiplierTransition.test.ts',
  'test/integration/VaultLifecycle.test.ts',
  'test/integration/OracleFreshness.test.ts',
  'test/adversarial/EventCacheStale.test.ts',
  'test/adversarial/RawVsUIUnitMismatch.test.ts',
  'test/adversarial/PendingMultiplierWindow.test.ts',
  'test/adversarial/PolicyApprovalDoesNotImplyTransfer.test.ts',
  'test/adversarial/PauseBoundary.test.ts'
];

console.log('Running Hardhat test suites (' + testSuites.length + ' suites)...');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const res = spawnSync(npx, ['hardhat', 'test', ...testSuites], { stdio: 'inherit' });
process.exit(res.status || 0);
