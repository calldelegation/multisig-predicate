predicate;

use std::{
    tx::{
        tx_witness_data,
        tx_witnesses_count,
        tx_id
    },
    constants::ZERO_B256,
    b512::B512,
    ecr::ec_recover_address
};

fn main() -> bool {
    let wallet_1_public_key = 0x06518005a3a85a82894928496a0191fe123b2f3990cff57a010d284988d27139;
    if (ec_recover_address(tx_witness_data(0), tx_id()).unwrap().value == wallet_1_public_key) {
        return true;
    }
    return false;
}