predicate;

use std::{
    tx::{
        tx_witness_data,
        tx_id
    },
    ecr::ec_recover_address
};

fn main() -> bool {
    let signer = 0x06518005a3a85a82894928496a0191fe123b2f3990cff57a010d284988d27139;
    if (ec_recover_address(tx_witness_data(0), tx_id()).unwrap().value == signer) {
        return true;
    }
    return false;
}