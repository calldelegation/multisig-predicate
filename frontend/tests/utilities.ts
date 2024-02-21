import { expect } from 'vitest';
import type { BN, BigNumberish, InputValue, WalletLocked, WalletUnlocked } from 'fuels';
import { Address, BaseAssetId, FUEL_NETWORK_URL, Predicate, Provider, ScriptTransactionRequest, Wallet, bn, toHex, toNumber } from 'fuels';
import { generateTestWallet } from '@fuel-ts/wallet/test-utils';

export const setupWallets = async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    const wallet = await generateTestWallet(provider, [[5_000_000, BaseAssetId]]);
    const receiver = Wallet.fromAddress(Address.fromRandom(), provider);
    return [wallet, receiver] as const;
  };

export const fundPredicate = async <T extends InputValue[]>(
    wallet: WalletUnlocked,
    predicate: Predicate<T>,
    amountToPredicate: BigNumberish
  ): Promise<BN> => {
    const { minGasPrice } = wallet.provider.getGasConfig();
  
    const request = new ScriptTransactionRequest({
      gasPrice: minGasPrice,
    });
  
    request.addCoinOutput(predicate.address, amountToPredicate, BaseAssetId);
    const { minFee, requiredQuantities, gasUsed } = await wallet.provider.getTransactionCost(request);
    request.gasLimit = gasUsed;
    await wallet.fund(request, requiredQuantities, minFee);
  
    await wallet.sendTransaction(request, { awaitExecution: true });
  
    return predicate.getBalance();
  };
  
  export const assertBalances = async <T extends InputValue[]>(
    predicate: Predicate<T>,
    receiver: WalletLocked,
    initialPredicateBalance: BN,
    initialReceiverBalance: BN,
    amountToPredicate: BigNumberish,
    amountToReceiver: BigNumberish
  ): Promise<void> => {
    // Check there are UTXO locked with the predicate hash
    expect(toNumber(initialPredicateBalance)).toBeGreaterThanOrEqual(toNumber(amountToPredicate));
    expect(initialReceiverBalance.toHex()).toEqual(toHex(0));
  
    // Check the balance of the receiver
    const finalReceiverBalance = await receiver.getBalance();
    expect(bn(initialReceiverBalance).add(amountToReceiver).toHex()).toEqual(
      finalReceiverBalance.toHex()
    );
  
    // Check we spent the entire predicate hash input
    const finalPredicateBalance = await predicate.getBalance();
    expect(finalPredicateBalance.lte(initialPredicateBalance)).toBeTruthy();
  };