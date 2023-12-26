use fuels::{accounts::predicate::Predicate, prelude::*};

// Load abi from json
abigen!(Predicate(
    name = "MyPredicate",
    abi = "out/debug/simple-predicate-abi.json"
));

async fn get_predicate_instance() -> Predicate {
    let bin_path = "./out/debug/simple-predicate.bin";

    let instance: Predicate = Predicate::load_from(bin_path).unwrap();

    instance
}

#[tokio::test]
async fn can_get_predicate_instance() {
    let instance = get_predicate_instance().await;

    let _predicate_root = instance.address();
    println!("{:?}", _predicate_root);
    // Now you have an instance of your predicate
}
