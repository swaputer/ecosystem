export interface OfficialFeatureScope {
  readonly explorer: true;
  readonly studio: true;
  readonly openMintMinter: true;
  readonly market: boolean;
  readonly seth: boolean;
}

/**
 * Market and sETH are part of the official first-launch surface. Unknown
 * environments still fail closed instead of enabling transaction-bearing
 * applications from an accidental or incomplete configuration.
 */
export function resolveOfficialFeatureScope(environment: string): Readonly<OfficialFeatureScope> {
  const officialEnvironment = ["local", "testnet", "mainnet", "production"].includes(environment);
  return Object.freeze({
    explorer: true,
    studio: true,
    openMintMinter: true,
    market: officialEnvironment,
    seth: officialEnvironment
  });
}
