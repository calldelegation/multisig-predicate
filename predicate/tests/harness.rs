use fuels::{
    accounts::{predicate::Predicate, wallet::WalletUnlocked, Account, fuel_crypto::SecretKey},
    prelude::*,
    types::{
        Bits256,
        B512,
        output::Output,
        input::Input,
        coin_type::CoinType,
        coin::Coin,
        transaction_builders::ScriptTransactionBuilder
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
    let private_key_1: SecretKey = "0x862512a2363db2b3a375c0d4bbbd27172180d89f23f2e259bac850ab02619301".parse().unwrap();
    let private_key_2: SecretKey = "0x37fa81c84ccd547c30c176b118d5cb892bdb113e8e80141f266519422ef9eefd".parse().unwrap();
    let private_key_3: SecretKey = "0x976e5c3fa620092c718d852ca703b6da9e3075b9f2ecb8ed42d9f746bf26aafb".parse().unwrap();

    let mut wallet_1: WalletUnlocked = WalletUnlocked::new_from_private_key(private_key_1, None);
    let mut wallet_2: WalletUnlocked = WalletUnlocked::new_from_private_key(private_key_2, None);
    let mut wallet_3: WalletUnlocked = WalletUnlocked::new_from_private_key(private_key_3, None);

    // CONFIGURABLES
    let total_signatures = 3;
    let required_signatures = 2;
    let signers = [
        wallet_1.address().into(),
        wallet_2.address().into(),
        wallet_3.address().into()
    ];
    let configurables = MultiSigConfigurables::new();
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

    // TXN BUILDER
    let mut tb = {
        // Wallets and predcaites
        let input_coin = Input::ResourceSigned {
            resource: CoinType::Coin(Coin {
                amount: 10000000,
                owner: wallet_1.address().clone(),
                ..Default::default()
            }),
        };

        let output_coin = Output::coin(
            Address::zeroed(), // take out ETH from predicate
            1,
            Default::default(),
        );

        ScriptTransactionBuilder::prepare_transfer(
            vec![input_coin],
            vec![output_coin],
            Default::default(),
            network_info,
        )
    };

    // Sign the transaction
    wallet_1.sign_transaction(&mut tb);

    // PREDICATE
    let predicate_binary_path = "./out/debug/predicate.bin";
    let predicate: Predicate = Predicate::load_from(predicate_binary_path)?
        .with_provider(provider.clone())
        .with_configurables(configurables);

    // CHECK BALANCE BEFORE
    println!("Wallet 1 Balance {:?}", provider.get_asset_balance(wallet_1.address(), asset_id).await?);
    println!("Predicate Balance {:?}", provider.get_asset_balance(predicate.address(), asset_id).await?);

    // SEND SOME MONEY TO PREDICATE
    println!("Send money TO the predicate");
    wallet_1.transfer(
        predicate.address(), 
        420, 
        asset_id, 
        TxParameters::default()
    )
    .await?;

    // CHECK BALANCE MIDDLE
    println!("Wallet 1 Balance {:?}", provider.get_asset_balance(wallet_1.address(), asset_id).await?);
    println!("Predicate Balance {:?}", provider.get_asset_balance(predicate.address(), asset_id).await?);
    
    // SPEND PREDICATE
    println!("Spend the predicate");
    let tx = tb.build()?;
    provider.send_transaction_and_await_commit(tx).await?;

    // CHECK BALANCE AFTER
    println!("Wallet 1 Balance {:?}", provider.get_asset_balance(wallet_1.address(), asset_id).await?);
    println!("Predicate Balance {:?}", provider.get_asset_balance(predicate.address(), asset_id).await?);
    Ok(())
}