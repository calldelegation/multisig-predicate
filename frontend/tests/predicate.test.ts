import { describe, it, beforeAll } from "vitest";
import { getForcProject } from "@fuel-ts/utils/test-utils";
import { BN, InputValue, JsonAbi, WalletLocked, WalletUnlocked } from "fuels";
import {
  bn,
  hexlify,
  U64Coder,
  BaseAssetId,
  Predicate,
  Provider,
  Address,
  ScriptTransactionRequest,
} from "fuels";
import { fundPredicate, assertBalances, setupWallets } from "./utilities";

const projectName = "predicate";

describe(projectName, () => {
  let predicate: Predicate<InputValue[]>;
  // let wallet: WalletUnlocked;
  // let receiver: WalletLocked;
  let coreWallet: WalletUnlocked;
  let provider: Provider;
  let gasPrice: BN;

  beforeAll(async () => {
    // Seed wallet from TS SDK Node
    process.env.GENESIS_SECRET = "0x02";

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
    const configurables = {
      REQUIRED_SIGNATURES: 1,
      SIGNERS: [
        { value: coreWallet.address.toB256() },
        { value: coreWallet.address.toB256() },
        { value: coreWallet.address.toB256() },
      ],
    };
    const { binHexlified: byteCode, abiContents: ABI } =
      getForcProject<JsonAbi>({ projectDir: `../${projectName}`, projectName });
    predicate = new Predicate(byteCode, provider, ABI, configurables);
  });

  it("transacts using predicate", async () => {
    const amountToPredicate = 100_000;
    const amountToReceiver = 50;
    // const initialReceiverBalance = await receiver.getBalance();

    // fund predicate
    const initialPredicateBalance = await fundPredicate(
      coreWallet,
      predicate,
      amountToPredicate
    );

    console.log(predicate.address.toHexString());

    // construct transaction
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

    const res = await predicate.sendTransaction(transactionRequest);
    console.log(res);

    console.log(new BN(await predicate.getBalance()).toNumber());
    console.log(new BN(await coreWallet.getBalance()).toNumber());

    // const tx = await predicate.transfer(receiver.address, amountToReceiver, BaseAssetId, {
    //   gasPrice,
    //   gasLimit: 10_000,
    // });
    // await tx.waitForResult();

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
