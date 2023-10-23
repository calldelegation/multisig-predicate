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

configurable {
    REQUIRED_SIGNATURES: u64 = 2,
    SIGNERS: [Address; 3] = [
        Address::from(0x0000000000000000000000000000000000000000000000000000000000000000),
        Address::from(0x0000000000000000000000000000000000000000000000000000000000000000),
        Address::from(0x0000000000000000000000000000000000000000000000000000000000000000)
    ]   
}

// Should return 
fn verify_signature(i: u64) -> u64 {
    // Discard any out of bounds signatures
    if (i >= tx_witnesses_count()) {
        return 0;
    }

    // TODO replace ZERO_B256 with tx_id
    let tx_hash = ZERO_B256;
    let current_signature = tx_witness_data::<B512>(i);
    let current_address = ec_recover_address(current_signature, tx_hash).unwrap();

    let mut j = 0;

    while j < 3 {
        if current_address.value == SIGNERS[i].value {
            return 1;
        }
        j += 1;
    }

    return 0;
}

fn main() -> bool {
    // Reject the transaction if there are not a sufficient number of signatures.
    if (3 <= tx_witnesses_count()) {
        return false;
    }

    let mut valid_signatures = 0;

    // Going through each of the signatures 
    valid_signatures = verify_signature(0);
    valid_signatures = valid_signatures + verify_signature(1);
    valid_signatures = valid_signatures + verify_signature(2);

    if valid_signatures >= REQUIRED_SIGNATURES {
        return true;
    }
    return false;
    return true;
}