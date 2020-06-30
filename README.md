DISCLAIMER : Proof of concept developed in the context of the NEAR stakewars competition (challenge004).

## Features
In the Near network :
- Estimates the next validator seat price.
- Rebalances the staked funds in the `poolAccountId` pool so the staked funds stay in between defined thresholds.

Know limitations : Not epoch-aware (gets info on `next` epoch), bad arithmetic precision, no alerts, no logs, totally unreliable.

## Running
The bot is written in Javascript/Typescript and requires `nodejs` and `npm`.
Install dependencies :
```
npm install
```
Compile & run monitoring
```
npm start
```

Alternatively, for development, you can compile...
```
npm run tsc
```
... and run (once) ...
```
node dist/index.js
```
... or run monitoring with a custom interval (every minute in this example)
```
node dist/index.js monitor -i 60
```

## Configuring
Copy the configuration file example.
```
cp warchest-bot.config.json.example warchest-bot.config.json
```
And modify it according to your needs :
```
{
  "warchestAccountId": "neozaru14.betanet",
  "poolAccountId": "neozaru.stakehouse.betanet",
  "near": {
    "networkId": "betanet",
    "nodeUrl": "http://neozaru.com:3030/",
    "keystoreDir": "./neardev"
  },
  "rebalancing": {
    "levels": {
      "lowThreshold": 1.4,
      "lowTarget": 1.5,
      "highTarget": 1.8,
      "highThreshold": 1.9
    },
    "policy": {
      "type": "BEST",
      "minRebalanceAmount": 1000
    }
  },
  "metrics": {
    "hostname": "localhost",
    "port": 3039
  }
}
```
- `near.keyStoreDir` should have the same structure as your `~/.near-credentials/` folder (you can actually set it to this folder). It should contain at least of keys associated with `warchestAccountId`.
- `rebalancing.levels` defines at what levels (`lowThreshold`, `highThreshold`) the automatic rebalancing should be triggered and to what levels (`lowTarget`, `highTarget`) it should put the stake by rebalancing.
Ex: If current seat price is 1000 and the currently staked balance in the pool is 1950, it will trigger the `highThreshold` (1950 > 1000 * `1.9`) and take action to set the staked balance in the pool to 1800 (`1.8` * 1000).
- `rebalancing.policy` defines what to do when the warchest account does have enough fund deposited in the pool to meet the stake/unstake target. Setting the type to `BEST` will make the warchest account stake/unstake as many tokens as it can even if it is not enough to meet the `lowTarget`/`highTarget`. It is triggered only if the user can stake/unstake at least `minRebalanceAmount` (in NEAR).

Another option for `rebalancing.policy` is FOK, which simply doesn't take any action if the warchest account doesn't have enough fund deposited :
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
# HELP near_warchest_pool_total_staked_balance near_warchest_pool_total_staked_balance
# TYPE near_warchest_pool_total_staked_balance gauge
near_warchest_pool_total_staked_balance 159168.66303537274

# HELP near_warchest_pool_warchest_staked_balance near_warchest_pool_warchest_staked_balance
# TYPE near_warchest_pool_warchest_staked_balance gauge
near_warchest_pool_warchest_staked_balance 48454.43643298201

# HELP near_warchest_pool_warchest_unstaked_balance near_warchest_pool_warchest_unstaked_balance
# TYPE near_warchest_pool_warchest_unstaked_balance gauge
near_warchest_pool_warchest_unstaked_balance 26752.866777301828

# HELP near_warchest_seat_price_next near_warchest_seat_price_next
# TYPE near_warchest_seat_price_next gauge
near_warchest_seat_price_next 106597.07229753271

# HELP near_warchest_seat_price_low_threshold near_warchest_seat_price_low_threshold
# TYPE near_warchest_seat_price_low_threshold gauge
near_warchest_seat_price_low_threshold 149235.59898509088

# HELP near_warchest_seat_price_high_threshold near_warchest_seat_price_high_threshold
# TYPE near_warchest_seat_price_high_threshold gauge
near_warchest_seat_price_high_threshold 202534.43736531216
```