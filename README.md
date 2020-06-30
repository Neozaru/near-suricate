*DISCLAIMER : Proof of concept for use in Near Betanet ONLY*

# Suricate

Monitoring program for Near Protocol validators

## Features
In the Near network :
- Keeps track of the next validator seat price and the funds staked in `poolAccoundId`.
- Using the funds staked/unstaked from `delegatorAccountId`, rebalances the staked funds in the `poolAccountId` pool so the staked funds stay in between defined thresholds (default: between 110% of seat price and 190% of seat price).
- Publishes delegator and pool prometheus metrics.

Know limitations : Not epoch-aware (gets info on `next` epoch), bad arithmetic precision, no alerts, no logs, totally unreliable.

## Usage

### Production (beta)
Install *suricate* globally
```
npm install -g near-suricate
```
Run
```
near-suricate monitor --delegatorAccountId <yourAccountId> --poolAccountId <yourPoolId> 
```
See [Configuring](#configuring) section for advanced usage.
### Development
The bot is written in Javascript/Typescript and requires `nodejs` and `npm`.
Install dependencies :
```
npm install
```
Compile, then start monitoring using `suricate.config.json` config file (See [Configuring](#configuring) section below)
```
npm start
```

Alternatively, for debugging, you can compile...
```
npm run tsc
```
... and run (once) with default config, setting account IDs as arguments ...
```
node dist/index.js --delegatorAccountId neozaru14.betanet --poolAccountId neozaru.stakehouse.betanet
```
... or run (monitoring) with given config file using a custom refresh interval (every minute in this example)
```
node dist/index.js monitor --config suricate.config.json -i 60
```

## Configuring

Suricate accepts parameters either via command line arguments or from a config file passed with `--config`. Command line arguments (if any) override config file values.

### Configuration file
Copy the configuration file example.
```
cp suricate.config.json.example suricate.config.json
```
And modify it according to your needs :
```
{
  "delegatorAccountId": "neozaru14.betanet",
  "poolAccountId": "neozaru.stakehouse.betanet",
  "near": {
    "networkId": "betanet",
    "nodeUrl": "https://rpc.betanet.near.org",
    "keystoreDir": "./neardev"
  },
  "rebalancing": {
    "levels": {
      "lowThreshold": 1.1,
      "lowTarget": 1.2,
      "highTarget": 1.8,
      "highThreshold": 1.9
    },
    "policy": {
      "type": "BEST",
      "minRebalanceAmount": 1000
    }
  },
  "metrics": {
    "enabled": true,
    "hostname": "0.0.0.0",
    "port": 3039
  }
}
```
- `near.keyStoreDir` should have the same structure as your `~/.near-credentials/` folder (you can actually set it to this folder). It should contain at least of keys associated with `delegatorAccountId`.
- `rebalancing.levels` defines at what levels (`lowThreshold`, `highThreshold`) the automatic rebalancing should be triggered and to what levels (`lowTarget`, `highTarget`) it should put the stake by rebalancing.
Ex: If current seat price is 1000 and the currently staked balance in the pool is 1950, it will trigger the `highThreshold` (1950 > 1000 * `1.9`) and take action to set the staked balance in the pool to 1800 (`1.8` * 1000).
- `rebalancing.policy` defines what to do when the delegator account does have enough fund deposited in the pool to meet the stake/unstake target. Setting the type to `BEST` will make the delegator account stake/unstake as many tokens as it can even if it is not enough to meet the `lowTarget`/`highTarget`. It is triggered only if the user can stake/unstake at least `minRebalanceAmount` (in NEAR).

Another option for `rebalancing.policy` is FOK, which simply doesn't take any action if the delegator account doesn't have enough fund deposited :
```
"rebalancing": {
  "policy": {
    "type": "FOK"
  },
  "levels": {
    [...]
  }
}
```



### Exported Metrics

The following metrics are exported for Prometheus on `http://<yourHost>:3039/metrics` by default.
```
# HELP suricate_pool_total_staked_balance suricate_pool_total_staked_balance
# TYPE suricate_pool_total_staked_balance gauge
suricate_pool_total_staked_balance 159168.66303537274

# HELP suricate_pool_delegator_staked_balance suricate_pool_delegator_staked_balance
# TYPE suricate_pool_delegator_staked_balance gauge
suricate_pool_delegator_staked_balance 48454.43643298201

# HELP suricate_pool_delegator_unstaked_balance suricate_pool_delegator_unstaked_balance
# TYPE suricate_pool_delegator_unstaked_balance gauge
suricate_pool_delegator_unstaked_balance 26752.866777301828

# HELP suricate_seat_price_next suricate_seat_price_next
# TYPE suricate_seat_price_next gauge
suricate_seat_price_next 106597.07229753271

# HELP suricate_seat_price_low_threshold suricate_seat_price_low_threshold
# TYPE suricate_seat_price_low_threshold gauge
suricate_seat_price_low_threshold 149235.59898509088

# HELP suricate_seat_price_high_threshold suricate_seat_price_high_threshold
# TYPE suricate_seat_price_high_threshold gauge
suricate_seat_price_high_threshold 202534.43736531216
```