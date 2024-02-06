import { useState, useEffect, useMemo } from "react";
import { BN, bn, Predicate, Provider, Address, BaseAssetId, WalletUnlocked, ScriptTransactionRequest, hexlify, transactionRequestify, Coin} from "fuels";
import { PredicateAbi__factory } from "../predicate";
import { useFuel, useIsConnected, useAccount, useWallet } from '@fuel-wallet/react';

type AddressInput = { value: string };

export default function Create() {
    const [predicate, setPredicate] = useState<Predicate<[]> | null>(null);
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
    const { wallet } = useWallet({ address: account });

    const configurable = useMemo(() => ({
        REQUIRED_SIGNATURES: threshold,
        SIGNERS: [
            address1 ? { value: Address.fromString(address1).toB256() } : null, 
            address2 ? { value: Address.fromString(address2).toB256() } : null, 
            address3 ? { value: Address.fromString(address3).toB256() } : null
        ].filter(Boolean) as [AddressInput, AddressInput, AddressInput],
    }), [address1, address2, address3, threshold]);

    useEffect(() => {
        async function fetchPredicate() {
            try {
                const provider = await Provider.create(
                    "https://beta-4.fuel.network/graphql"
                );
                const predicateInstance = new Predicate(PredicateAbi__factory.bin, provider, PredicateAbi__factory.abi, configurable);
                setPredicate(predicateInstance);
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
                "https://beta-4.fuel.network/graphql"
            );

            const wallet = new WalletUnlocked(Address.fromB256("0x5e4196a18388a0c3dd8cd112928438b76c2d760421c3d8ae8c2d031c72a02378").toBytes(), provider);
            const request = new ScriptTransactionRequest();
            // const coin: Coin = {
            //     id: BaseAssetId,
            //     assetId: BaseAssetId,
            //     amount: bn(1),
            //     owner: predicate.address,
            //     maturity: 0,
            //     blockCreated: bn(1),
            //     txCreatedIdx: bn(1),
            // }
            // request.addCoinInput(coin, predicate)
            // console.log(provider)
            // console.log(wallet.)

            console.log("wallet", wallet.address.toB256())
            console.log("wallet balance", (await wallet.getBalance(BaseAssetId)).toNumber());
            console.log("predicate", predicate.address.toB256())
            console.log("predicate balance", (await predicate.getBalance(BaseAssetId)).toNumber());


            // const walletResources = await wallet.getResourcesToSpend([[bn(1), BaseAssetId]]);
            // request.addResources(walletResources)
            // console.log("wallet resources", walletResources)

            const predicateResources = await predicate.getResourcesToSpend([[bn(1), BaseAssetId]]);
            console.log("predicate resources", predicateResources)
            request.addPredicateResources(predicateResources, predicate);

            console.log("here", provider.cache)

            const txCost = await provider.getTransactionCost(request);
            request.gasLimit = txCost.gasUsed;
            request.gasPrice = txCost.gasPrice;

            predicate.populateTransactionPredicateData(request);
            await wallet.populateTransactionWitnessesSignature(request);
            await wallet.signTransaction(request)
            const result = await predicate.sendTransaction(request);
            console.log(result)
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
                    { predicate.address.toB256().toString() }
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
