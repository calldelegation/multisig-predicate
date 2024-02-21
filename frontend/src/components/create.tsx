import { useState, useEffect, useMemo } from "react";
import {
  BN,
  bn,
  Predicate,
  Provider,
  Address,
  BaseAssetId,
  WalletUnlocked,
  ScriptTransactionRequest,
  hexlify,
  transactionRequestify,
  Coin,
  InputValue,
} from "fuels";
import { PredicateAbi__factory } from "../predicate";
import {
  useFuel,
  useIsConnected,
  useAccount,
  useWallet,
} from "@fuel-wallet/react";

type AddressInput = { value: string };

export default function Create() {
  const [predicate, setPredicate] = useState<Predicate<
    InputValue<void>[]
  > | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isMultisigGenerated, setIsMultisigGenerated] = useState(false);

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [address3, setAddress3] = useState("");
  const [threshold, setThreshold] = useState<number>(1);

  const [destinationAddress, setDestinationAddress] = useState("");
  const [amountToSend, setAmountToSend] = useState("");

  const { isConnected } = useIsConnected();
  const { fuel } = useFuel();
  const { account } = useAccount();
  const { wallet } = useWallet();

  const configurable = useMemo(
    () => ({
      REQUIRED_SIGNATURES: threshold,
      SIGNERS: [
        address1 ? { value: Address.fromString(address1).toB256() } : null,
        address2 ? { value: Address.fromString(address2).toB256() } : null,
        address3 ? { value: Address.fromString(address3).toB256() } : null,
      ].filter(Boolean) as [AddressInput, AddressInput, AddressInput],
    }),
    [address1, address2, address3, threshold]
  );

  useEffect(() => {
    async function fetchPredicate() {
      try {
        const provider = await Provider.create(
          "https://beta-5.fuel.network/graphql"
        );
        console.log(configurable);
        const predicateInstance = new Predicate(
          PredicateAbi__factory.bin,
          provider,
          PredicateAbi__factory.abi,
          configurable
        );
        setPredicate(predicateInstance);
        console.log("predicate instance", predicateInstance);
      } catch (error) {
        console.error("Error fetching predicate:", error);
      }
    }

    if (address1 && address2 && address3 && threshold) {
      fetchPredicate();
    }
  }, [address1, address2, address3, threshold]);

  useEffect(() => {
    async function fetchBalance() {
      if (predicate) {
        const balanceValue = await predicate.getBalance();
        setBalance(new BN(balanceValue).toNumber());
      }
    }

    fetchBalance();
  }, [predicate]);

  const areAllFieldsFilled = address1 && address2 && address3 && threshold;

  const handleGenerateMultisig = () => {
    if (areAllFieldsFilled) {
      setIsMultisigGenerated(true);
    } else {
      alert("Please fill all address fields and select a threshold.");
    }
  };

  const handleTransfer = async () => {
    if (!predicate) {
      console.error("Predicate instance is not available.");
      return;
    }

    // if (!wallet) {
    //     console.error("Wallet is not available.");
    //     return;
    // }

    try {
      // const tx = await predicate.simulateTransaction.getTransferTxId(Address.fromString(destinationAddress), bn.parseUnits(amountToSend.toString()), BaseAssetId, {
      //     gasPrice,
      // });
      const provider = await Provider.create(
        "https://beta-5.fuel.network/graphql"
      );

      const wallet = new WalletUnlocked(
        Address.fromB256(
          "0x1645232ff766da588e0883ac61318b2b91f9874fc6bf1cf170575a90a1743b3b"
        ).toBytes(),
        provider
      );

      const request = new ScriptTransactionRequest({
        script: PredicateAbi__factory.bin,
        gasLimit: 10_000,
        gasPrice: provider.getGasConfig().minGasPrice,
      });

      request.addCoinOutput(wallet.address, bn(100_000), BaseAssetId);
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

      const signedTransaction = await wallet.signTransaction(request);

      const transactionRequest =
        await wallet.populateTransactionWitnessesSignature({
          ...request,
          witnesses: [signedTransaction],
        });
      const res = await predicate.sendTransaction(transactionRequest);
      console.log(res)
    } catch (error) {
      console.error("Error during transfer:", error);
    }
  };

  useEffect(() => {
    console.log("Configurable updated:", configurable);
  }, [configurable]);

  return (
    <div>
      {/* Textboxes for addresses */}
      <input
        type="text"
        value={address1}
        onChange={(e) => setAddress1(e.target.value)}
        placeholder="Address 1"
      />
      <input
        type="text"
        value={address2}
        onChange={(e) => setAddress2(e.target.value)}
        placeholder="Address 2"
      />
      <input
        type="text"
        value={address3}
        onChange={(e) => setAddress3(e.target.value)}
        placeholder="Address 3"
      />

      {/* Dropdown for threshold */}
      <select
        value={threshold}
        onChange={(e) => setThreshold(parseInt(e.target.value))}
      >
        <option value={1}>1</option>
        <option value={2}>2</option>
        <option value={3}>3</option>
      </select>

      {/* Generate Multisig Button */}
      <button onClick={handleGenerateMultisig}>Generate Multisig</button>

      {/* Conditional rendering of predicate.address */}
      {isMultisigGenerated && predicate && (
        <h2 style={{ cursor: "pointer" }}>
          {predicate.address.toB256().toString()}
        </h2>
      )}

      {balance !== null ? <p>Balance: {balance}</p> : <p>Loading Balance...</p>}

      <input
        type="text"
        value={destinationAddress}
        onChange={(e) => setDestinationAddress(e.target.value)}
        placeholder="Destination Address"
      />

      {/* New input field for amount */}
      <input
        type="text" // or "number" depending on how you want to handle the input
        value={amountToSend}
        onChange={(e) => setAmountToSend(e.target.value)}
        placeholder="Amount to Send"
      />

      <button onClick={handleTransfer}>Transfer Funds</button>
    </div>
  );
}
