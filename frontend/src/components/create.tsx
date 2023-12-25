import { useState, useEffect } from "react";
import { BN, Predicate, Provider } from 'fuels';
import { PredicateAbi__factory } from "../predicate";

export default function Create() {
  const [predicate, setPredicate] = useState<Predicate<[]> | null>(null);
  const [showB256Format, setShowB256Format] = useState(true); // State for format toggling

  useEffect(() => {
    async function fetchPredicate() {
      const provider = await Provider.create("https://beta-4.fuel.network/graphql");
      const predicateInstance = PredicateAbi__factory.createInstance(provider);
      setPredicate(predicateInstance);
    }

    fetchPredicate();
  }, []);

  async function logBalance() {
    if (predicate) {
      const balance = await predicate.getBalance();
      console.log(new BN(balance).toNumber());
    }
  }

  useEffect(() => {
    logBalance();
  }, [predicate]);

  // Function to toggle address format
  const toggleAddressFormat = () => {
    setShowB256Format(!showB256Format);
  };

  return (
    <div>
      <h2 onClick={toggleAddressFormat} style={{ cursor: 'pointer' }}>
        {predicate
          ? (showB256Format
            ? predicate.address.toB256().toString()
            : predicate.address.toString())
          : "Loading Predicate Address"
        }
      </h2>
      {/* Additional JSX */}
    </div>
  );
}
