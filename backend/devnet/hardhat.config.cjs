// Private local chain for hands-on wallet testing, started by `npm run devnet`.
// Transactions are mined immediately and an empty block follows every two
// seconds, so confirmations keep accruing as they would on a public network.
module.exports = {
    networks: {
        hardhat: {
            chainId: 31337,
            mining: { auto: true, interval: 2000 },
            // Return reverted transactions like a public RPC instead of throwing.
            throwOnTransactionFailures: false,
        },
    },
};
