predicate;

use std::{
    tx::tx_witnesses_count
};

fn main() -> bool {
    if (tx_witnesses_count() >= 2) {
        return true;
    }
    return false;
}
