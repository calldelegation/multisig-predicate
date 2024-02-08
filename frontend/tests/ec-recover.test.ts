import { describe, it, beforeAll } from "vitest";
import { getForcProject } from "@fuel-ts/utils/test-utils";
import {
  BN,
  InputValue,
  JsonAbi,
  ScriptTransactionRequest,
  WalletLocked,
  WalletUnlocked,
  Address,
  bn,
  Script,
} from "fuels";
import { BaseAssetId, Predicate, Provider, hexlify, U64Coder } from "fuels";
import { fundPredicate, assertBalances, setupWallets } from "./utilities";

const projectName = "ec-recover";

describe(projectName, () => {
  let predicate: Predicate<InputValue[]>;
  let wallet: WalletUnlocked;
  let receiver: WalletLocked;
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
    console.log(coreWallet.address.toHexString());
    gasPrice = provider.getGasConfig().minGasPrice;

    // Setup predicate
    const { binHexlified: byteCode } = getForcProject<JsonAbi>({
      projectDir: `../${projectName}`,
      projectName,
    });
    predicate = new Predicate(byteCode, provider);
  });

  it("transacts using predicate", async () => {
    const amountToPredicate = 200_000;
    const amountToReceiver = 50;
    // const initialReceiverBalance = await receiver.getBalance();

    console.log(coreWallet.getBalance());

    const initialPredicateBalance = await fundPredicate(
      coreWallet,
      predicate,
      amountToPredicate
    );

    // ENCASE_START_SCRIPT_TRANSACTION    
    const { binHexlified: byteCode } = getForcProject<JsonAbi>({
      projectDir: `../${projectName}`,
      projectName,
    });

    const request = new ScriptTransactionRequest({
      script: byteCode,
      scriptData: hexlify(new U64Coder().encode(bn(2000))),
      gasLimit: 10_000,
      gasPrice: provider.getGasConfig().minGasPrice,
    });
    request.addCoinOutput(coreWallet.address, bn(100), BaseAssetId);
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
    // ENCASE_END_SCRIPT_TRANSACTION
    
    // construct transaction
    // ENCASE_CREATE_TRANSFER
    // Question: Why is there no witness found?
    // const request = await predicate.createTransfer(
    //   coreWallet.address,
    //   amountToReceiver,
    //   BaseAssetId,
    //   {
    //     gasPrice: provider.getGasConfig().minGasPrice,
    //     gasLimit: 1_000,
    //   }
    // );
    // ENCASE_CREATE_TRANSFER

    // const resources = await coreWallet.getResourcesToSpend([[amountToReceiver, BaseAssetId]]);
    // const signature = await coreWallet.signTransaction(request);

    // request.addResources(resources);
    const signedTransaction = await coreWallet.signTransaction(request);
    // predicate.populateTransactionPredicateData(request);
    const transactionRequest =
      await coreWallet.populateTransactionWitnessesSignature({
        ...request,
        witnesses: [signedTransaction]
    });

    // console.log("Signature", signature);
    console.log("Witnesses", transactionRequest.witnesses);
    console.log("Cache", provider.cache);
    // const tx = await predicate.transfer(
    //   receiver.address,
    //   amountToReceiver,
    //   BaseAssetId,
    //   {
    //     gasPrice,
    //     gasLimit: 10_000,
    //   }
    // );
    // await tx.waitForResult();
    const res = await predicate.sendTransaction(transactionRequest);
    console.log(res);

    console.log(new BN(await predicate.getBalance()).toNumber());
    console.log(new BN(await coreWallet.getBalance()).toNumber());

    // await assertBalances(
    //   predicate,
    //   receiver,
    //   initialPredicateBalance,
    //   initialReceiverBalance,
    //   amountToPredicate,
    //   amountToReceiver
    // );
  });
});
