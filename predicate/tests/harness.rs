use fuels::{
    accounts::{predicate::Predicate, wallet::{WalletUnlocked, self}, Account, fuel_crypto::SecretKey},
    prelude::*,
    types::{
        Bits256,
        B512,
        output::Output,
        input::Input,
        coin_type::CoinType,
        coin::Coin,
        transaction_builders::{
            ScriptTransactionBuilder,
            TransactionBuilder
        }
    }
};

use std::str::FromStr;


abigen!(Predicate(
    name = "MultiSig",
    abi = "./out/debug/predicate-abi.json"
));

#[tokio::test]
async fn predicate_test() -> Result<()> {
    // WALLETS
    let private_key_1: SecretKey = "0xc2620849458064e8f1eb2bc4c459f473695b443ac3134c82ddd4fd992bd138fd".parse().unwrap();
    let private_key_2: SecretKey = "0x37fa81c84ccd547c30c176b118d5cb892bdb113e8e80141f266519422ef9eefd".parse().unwrap();
    let private_key_3: SecretKey = "0x976e5c3fa620092c718d852ca703b6da9e3075b9f2ecb8ed42d9f746bf26aafb".parse().unwrap();

    let mut wallet_1: WalletUnlocked = WalletUnlocked::new_from_private_key(private_key_1, None);
    let mut wallet_2: WalletUnlocked = WalletUnlocked::new_from_private_key(private_key_2, None);
    let mut wallet_3: WalletUnlocked = WalletUnlocked::new_from_private_key(private_key_3, None);

    // convert addresses here
    println!("Wallet 1 Address: 0x{:?}", wallet_1.address().hash());
    println!("Wallet 2 Address: 0x{:?}", wallet_2.address().hash());
    println!("Wallet 3 Address: 0x{:?}", wallet_3.address().hash());

    // CONFIGURABLES
    let total_signatures = 3;
    let required_signatures = 2;
    let signers: [Address; 3]= [
        wallet_1.address().into(),
        wallet_2.address().into(),
        wallet_3.address().into()
    ];
    let configurables = MultiSigConfigurables::new();
    // NOTE: Must be using configurables in main to generate functions
        // .with_REQUIRED_SIGNATURES(required_signatures)
        // .with_SIGNERS(signers);

    // SETUP
    let asset_id = AssetId::default();
    let all_coins = [&wallet_1]
        .iter()
        .flat_map(|wallet| {
            setup_single_asset_coins(wallet.address(), AssetId::default(), 10, 1_000_000)
        })
        .collect::<Vec<_>>();

    let node_config = Config::local_node();
    let provider =
        setup_test_provider(all_coins, vec![], Some(node_config), None).await;

    let network_info = provider.network_info().await?;

    [&mut wallet_1]
        .iter_mut()
        .for_each(|wallet| {
            wallet.set_provider(provider.clone());
        });

    // PREDICATE
    let predicate_binary_path = "./out/debug/predicate.bin";
    let predicate: Predicate = Predicate::load_from(predicate_binary_path)?
        .with_provider(provider.clone())
        .with_configurables(configurables);
    // attach predciate data here before inptus

    // SEND SOME MONEY TO PREDICATE
    println!("Send money TO the predicate");
    wallet_1.transfer(
        predicate.address(), 
        420, 
        asset_id, 
        TxParameters::default()
    )
    .await?;

    // TXN BUILDER
    let mut tb = {
        // Wallets and predicates
        // let input_coin = Input::ResourceSigned {
        //     resource: CoinType::Coin(Coin {
        //         amount: 0,
        //         owner: wallet_1.address().clone(),
        //         ..Default::default()
        //     }),
        // };
        // A coin just owned by a wallet 

        // QUESTION: What is wrong here
        // let input_coin = Input::ResourcePredicate { 
        //     resource: CoinType::Coin(Coin {
        //         amount: 1000,
        //         owner: wallet_1.address().clone(),
        //         ..Default::default()
        //     }),
        //     code: predicate.code().clone(), 
        //     data: predicate.data().clone() 
        // };
        // A resource owned by a predicate
        
        // QUESTION_PT2: Why do you have to specify ANY input here?
        let amount_to_send = 12;
        let input_coin = predicate.get_asset_inputs_for_amount(asset_id, 1).await?;
        // call on predicate or wallet
        // set of resource predicate

        // QUESTION: Resource signed vs resource predicates
        // QUESTION: Resource signed vs signing the transaction?
        // QUESTION: Is gas included? or is it done when the txn is built

        // QUESTION: Where is the predicate address?
        // QUESTION: What is the difference between coin and change
        // let output_coin = Output::coin(
        //     wallet_1.address().into(), // take out ETH from predicate
        //     0,
        //     asset_id,
        // );

        let output_coin = predicate.get_asset_outputs_for_amount(
            wallet_1.address().into(), 
            asset_id, 
            amount_to_send
        );

        // let output_coin = predicate.get_asset_outputs_for_amount(
        //     wallet_1.address(), asset_id, amount)

        ScriptTransactionBuilder::prepare_transfer(
            input_coin,
            output_coin,
            TxParameters::default().with_gas_price(1),
            network_info.clone(),
        )
    };

    // Sign the transaction
    // Do I have to manually add to the witness data?
    // try this first
    // https://github.com/FuelLabs/fuels-rs/blob/66aef68f74a76dda0d41d678055cf35ee00e5535/examples/predicates/src/lib.rs#L57=#L71
    wallet_1.sign_transaction(&mut tb);
    wallet_2.sign_transaction(&mut tb);
    // wallet_3.sign_transaction(&mut tb);

    // CHECK BALANCE BEFORE
    println!("Wallet 1 Balance {:?}", provider.get_asset_balance(wallet_1.address(), asset_id).await?);
    println!("Predicate Balance {:?}", provider.get_asset_balance(predicate.address(), asset_id).await?);

    // CHECK BALANCE MIDDLE
    println!("Wallet 1 Balance {:?}", provider.get_asset_balance(wallet_1.address(), asset_id).await?);
    println!("Predicate Balance {:?}", provider.get_asset_balance(predicate.address(), asset_id).await?);
    
    // SPEND PREDICATE
    println!("Spend the predicate");
    let tx = tb.build()?;
    
    println!("Witnesses here: {:?}", tx.witnesses());
    println!("Gas Price here: {:?}", tx.gas_price());
    println!("Txn ID here: {:?}", tx.id(network_info.chain_id()));
    println!("Txn maturity here: {:?}", tx.maturity());

    provider.send_transaction_and_await_commit(tx).await?;

    // CHECK BALANCE AFTER
    println!("Wallet 1 Balance {:?}", provider.get_asset_balance(wallet_1.address(), asset_id).await?);
    println!("Predicate Balance {:?}", provider.get_asset_balance(predicate.address(), asset_id).await?);
    Ok(())

    // QUESTION: Handling transaction id from predicate
}

// https://github.com/FuelLabs/fuels-rs/blob/812144352513acfc4cfbe48b2e7d21bfb4fee1ce/packages/fuels/tests/predicates.rs#L294

// can_set_configurables

// Questions:
// When should I use configurables vs 