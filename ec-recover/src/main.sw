predicate;

use std::{
    tx::{
        tx_witness_data,
        tx_id
    },
    ecr::ec_recover_address
};

fn main() -> bool {
    let signer = 0x6b63804cfbf9856e68e5b6e7aef238dc8311ec55bec04df774003a2c96e0418e;
    if (ec_recover_address(tx_witness_data(0), tx_id()).unwrap().value == signer) {
        return true;
    }
    return false;
}
