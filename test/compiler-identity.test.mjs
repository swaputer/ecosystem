import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compileTinySol } from '@swaputer-labs/tinysol';
const release = JSON.parse(readFileSync(new URL('../config/ethereum-mainnet.json', import.meta.url), 'utf8'));

test('published compiler reproduces the pinned OpenMintSRC20.tiny.sol package', () => {
  const file = 'OpenMintSRC20.tiny.sol';
  const source = readFileSync(new URL(`../src/programs/${file}`, import.meta.url), 'utf8');
  assert.equal(compileTinySol(source, { sourceName: file }).codeHash.toLowerCase(), release.programs.openMintSrc20CodeHash.toLowerCase());
});
