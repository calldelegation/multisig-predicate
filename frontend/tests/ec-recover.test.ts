import { describe, it, beforeAll } from "vitest";
import { getForcProject } from "@fuel-ts/utils/test-utils";
import {
  BN,
  InputValue,
  JsonAbi,
  WalletUnlocked,
  Address,
  bn,
} from "fuels";
import { BaseAssetId, Predicate, Provider } from "fuels";
import { fundPredicate } from "./utilities";

const projectName = "ec-recover";

describe(projectName, () => {
  let predicate: Predicate<InputValue[]>;
  //   let wallet: WalletUnlocked;
  //   let receiver: WalletLocked;
  let coreWallet: WalletUnlocked;
  let provider: Provider;
  let gasPrice: BN;

  beforeAll(async () => {
    // Seed wallet from TS SDK Node
    process.env.GENESIS_SECRET = "0x03";

    // Setup wallets
    // [wallet, receiver] = await setupWallets();
    provider = await Provider.create("http://127.0.0.1:4000/graphql");
    coreWallet = new WalletUnlocked(
      Address.fromB256(
        "0xde97d8624a438121b86a1956544bd72ed68cd69f2c99555b08b1e8c51ffd511c"
      ).toBytes(),
      provider
    );
    gasPrice = provider.getGasConfig().minGasPrice;

    // Setup predicate
    const { binHexlified: byteCode } = getForcProject<JsonAbi>({
      projectDir: `../${projectName}`,
      projectName,
    });
    predicate = new Predicate(byteCode, provider);
  });

  it("transacts using predicate", async () => {
    const amountToPredicate = 100_000;
    const amountToReceiver = 50;

    const initialPredicateBalance = await fundPredicate(
      coreWallet,
      predicate,
      amountToPredicate
    );

    const request = await predicate.createTransfer(
      coreWallet.address,
      amountToReceiver,
      BaseAssetId,
      {
        gasPrice: provider.getGasConfig().minGasPrice,
        gasLimit: 10_000,
      }
    );

    request.addCoinOutput(coreWallet.address, bn(100_000), BaseAssetId);
    const resourcesPredicate = await provider.getResourcesToSpend(
      predicate.address,
      [
        {
          amount: bn(100_000),
          assetId: BaseAssetId,
        },
      ]
    );
    request.addPredicateResources(resourcesPredicate, predicate);

    const signedTransaction = await coreWallet.signTransaction(request);
    const transactionRequest =
      await coreWallet.populateTransactionWitnessesSignature({
        ...request,
        witnesses: [signedTransaction],
      });

    console.log("Witnesses", transactionRequest.witnesses);
    console.log("Cache", provider.cache);

    const res = await predicate.sendTransaction(transactionRequest);

    console.log(new BN(await predicate.getBalance()).toNumber());
    console.log(new BN(await coreWallet.getBalance()).toNumber());
  });

  it("transacts using predicate fails", async () => {
    const amountToPredicate = 100_000;
    const amountToReceiver = 50;

    const initialPredicateBalance = await fundPredicate(
      coreWallet,
      predicate,
      amountToPredicate
    );

    const request = await predicate.createTransfer(
      coreWallet.address,
      amountToReceiver,
      BaseAssetId,
      {
        gasPrice: provider.getGasConfig().minGasPrice,
        gasLimit: 10_000,
      }
    );

    request.addCoinOutput(coreWallet.address, bn(100_000), BaseAssetId);
    const resourcesPredicate = await provider.getResourcesToSpend(
      predicate.address,
      [
        {
          amount: bn(100_000),
          assetId: BaseAssetId,
        },
      ]
    );
    request.addPredicateResources(resourcesPredicate, predicate);

    // Transaction witness is not filled in correctly
    const signedTransaction = await coreWallet.signTransaction(request);
    const transactionRequest =
      await coreWallet.populateTransactionWitnessesSignature(request);

    console.log("Witnesses", transactionRequest.witnesses);
    console.log("Cache", provider.cache);

    const res = await predicate.sendTransaction(transactionRequest);

    console.log(new BN(await predicate.getBalance()).toNumber());
    console.log(new BN(await coreWallet.getBalance()).toNumber());
  });
});
