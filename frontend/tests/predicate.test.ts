import { describe, it, beforeAll } from 'vitest';
import { getForcProject } from '@fuel-ts/utils/test-utils';
import type { BN, InputValue, JsonAbi, WalletLocked, WalletUnlocked } from 'fuels';
import { BaseAssetId, Predicate, Provider } from 'fuels';
import { fundPredicate, assertBalances, setupWallets } from './utilities';

const projectName = 'predicate';

describe(projectName , () => {
  let predicate: Predicate<InputValue[]>;
  let wallet: WalletUnlocked;
  let receiver: WalletLocked;
  let provider: Provider;
  let gasPrice: BN;

  beforeAll(async () => {
    // Seed wallet from TS SDK Node
    process.env.GENESIS_SECRET = '0x02';

    // Setup wallets
    [wallet, receiver] = await setupWallets();
    provider = wallet.provider;
    gasPrice = provider.getGasConfig().minGasPrice;

    // Setup predicate
    const { binHexlified: byteCode} = getForcProject<JsonAbi>({projectDir: `../${projectName}`, projectName});
    predicate = new Predicate(byteCode, provider);
  });


    it('transacts using predicate', async () => {
      const amountToPredicate = 200_000;
      const amountToReceiver = 50;
      const initialReceiverBalance = await receiver.getBalance();

      const initialPredicateBalance = await fundPredicate(wallet, predicate, amountToPredicate);

      const tx = await predicate.transfer(receiver.address, amountToReceiver, BaseAssetId, {
        gasPrice,
        gasLimit: 10_000,
      });
      await tx.waitForResult();

      await assertBalances(
        predicate,
        receiver,
        initialPredicateBalance,
        initialReceiverBalance,
        amountToPredicate,
        amountToReceiver
      );
    });
});