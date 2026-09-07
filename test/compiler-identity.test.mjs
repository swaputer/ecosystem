import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compileTinySol } from '@swaputer-labs/tinysol';
const release = JSON.parse(readFileSync(new URL('../config/base-sepolia.json', import.meta.url), 'utf8'));
for (const [file, expected] of [['OpenMintSRC20.tiny.sol', release.programs.openMintSrc20CodeHash], ['MarketEscrow.tiny.sol', release.programs.marketEscrow.codeHash]]) {
  test(`published compiler reproduces the pinned ${file} package`, () => {
    const source = readFileSync(new URL(`../src/programs/${file}`, import.meta.url), 'utf8');
    assert.equal(compileTinySol(source, { sourceName: file }).codeHash.toLowerCase(), expected.toLowerCase());
  });
}
