use fuels::{
    accounts::{
        predicate::Predicate, 
        wallet::{WalletUnlocked, self}, 
        Account, 
        fuel_crypto::{
            SecretKey,
            Signature,
            Message
        }
    },
    prelude::*,
    types::{
        Bits256,
        B512,
        output::{Output, self},
        input::{Input, self},
        coin_type::CoinType,
        coin::Coin,
        // message::Message,
        transaction_builders::{
            ScriptTransactionBuilder,
            TransactionBuilder
        }
    },
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

    let mut wallet_1: WalletUnlocked = WalletUnlocked::new_from_private_key(private_key_1, None);
    let mut wallet_2: WalletUnlocked = WalletUnlocked::new_from_private_key(private_key_2, None);

    // ADDRESS HASHES
    println!("Wallet 1 Address: 0x{:?}", wallet_1.address().hash());
    println!("Wallet 2 Address: 0x{:?}", wallet_2.address().hash());

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
        .with_provider(provider.clone());

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
    let mut tb: ScriptTransactionBuilder = {
        let input_coin = predicate.get_asset_inputs_for_amount(asset_id, 100).await?;

        let output_coin = predicate.get_asset_outputs_for_amount(
            wallet_1.address().into(), 
            asset_id, 
            7
        );

        ScriptTransactionBuilder::prepare_transfer(
            input_coin,
            output_coin,
            TxParameters::default(),
            network_info.clone(),
        )
    };

    wallet_1.sign_transaction(&mut tb);
    wallet_2.sign_transaction(&mut tb);

    // CHECK BALANCE BEFORE
    println!("Wallet 1 Balance {:?}", provider.get_asset_balance(wallet_1.address(), asset_id).await?);
    println!("Predicate Balance {:?}", provider.get_asset_balance(predicate.address(), asset_id).await?);

    // CHECK BALANCE MIDDLE
    println!("Wallet 1 Balance {:?}", provider.get_asset_balance(wallet_1.address(), asset_id).await?);
    println!("Predicate Balance {:?}", provider.get_asset_balance(predicate.address(), asset_id).await?);
    
    
    // SPEND PREDICATE
    println!("Spend the predicate");
    let tx: ScriptTransaction = tb.build()?;

    let bytes = <[u8; Signature::LEN]>::try_from(tx.witnesses().first().unwrap().as_ref())?;
    let tx_signature = Signature::from_bytes(bytes);

    println!("Signature 1 {:?}", tx_signature);

    // Sign the transaction manually
    let message = Message::from_bytes(*tx.id(0.into()));
    let signature = Signature::sign(&private_key_1, &message);

    println!("Signature 2 {:?}", signature);

    // Recover the address that signed the transaction
    let recovered_address = signature.recover(&message).unwrap();
    println!("Public Key 1 {:?}", recovered_address.hash());
    // My wallet public key 0x06518005a3a85a82894928496a0191fe123b2f3990cff57a010d284988d27139

    provider.send_transaction_and_await_commit(tx).await?;

    // CHECK BALANCE AFTER
    println!("Wallet 1 Balance {:?}", provider.get_asset_balance(wallet_1.address(), asset_id).await?);
    println!("Predicate Balance {:?}", provider.get_asset_balance(predicate.address(), asset_id).await?);
    Ok(())
}