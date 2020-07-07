*DISCLAIMER : Proof of concept in intense development. For use in Near Betanet ONLY*

# Suricate

Monitoring program for Near Protocol validators

## Features
In the Near network :
- Keeps track of the next validator seat price and the funds staked in `poolAccoundId`.
- Using the funds staked/unstaked from `delegatorAccountId`, rebalances the staked funds in the `poolAccountId` pool so the staked funds stay in between defined thresholds (default: between 110% of seat price and 190% of seat price).
- Publishes delegator and pool Prometheus metrics (default on `http://<yourHost>:3039/metrics`).
- Emits alerts when node is outdated or when validator status changes or online rate is below 95% (more alerts to come).

Know limitations : Not epoch-aware (gets info on `next` epoch), bad arithmetic precision.

## Usage

### Production (betanet)
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
... and run with given config file (at least the required <delegatorAccountId> and <poolAccountId> fields must be present in the file)
```
node dist --config suricate.config.json
```

## Configuring

Suricate accepts parameters either via command line arguments or from a config file passed with `--config`. 
Other command line arguments override config file values (ex: `--alerts.enabled=false`).

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
    "nodeUrl": "https://rpc.betanet.near.org/",
    "keystoreDir": "./neardev/"
  },
  "rebalancing": {
    "enabled": true,
    "levels": {
      "lowThreshold": 1.2,
      "lowTarget": 1.3,
      "highTarget": 1.7,
      "highThreshold": 1.8
    },
    "policy": {
      "type": "BEST",
      "minRebalanceAmount": 1000
    }
  },
  "alerts": {
    "enabled": true,
    "emitters": ["console"]
  },
  "metrics": {
    "enabled": true,
    "hostname": "0.0.0.0",
    "port": 3039
  }
}
```
#### near{}
- `near.keystoreDir` should have the same structure as your `~/.near-credentials/` folder (which is default value if you simply omit it). It should contain at least of keys associated with `delegatorAccountId`.
#### rebalancing{}
- `rebalancing.levels` defines at what levels (`lowThreshold`, `highThreshold`) the automatic rebalancing should be triggered and to what levels (`lowTarget`, `highTarget`) it should put the stake by rebalancing.
Ex: If current seat price is 1000 and the currently staked balance in the pool is 1850, it will trigger the `highThreshold` (1850 > 1000 * `1.8`) and take action to set the staked balance in the pool to 1700 (`1.7` * 1000).
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
#### alerts{}
Alerts are scanned every `interval` seconds (default every 5 minutes).
The same alert won't be triggered twice for the same epoch, but the same alert will be triggered again if the epoch changes and the same alert persists.
By default, they are logged to the console. You can set up email alerts by modifying the `alerts{}` configuration :
```
"alerts": {
  "enabled": true,
  "emitters": ["mail", "console"],
  "mail": {
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 465,
      "secure": true,
      "auth": {
        "user": "neozaru14@gmail.com",
        "pass": "<yourMailPassword>"
      }
    },
    "sender": "neozaru14@gmail.com",
    "recipients": ["neozaru14@gmail.com"]
  }
},
```
... will send alert both by mail and to the console.
Note that the `alerts.mail.smtp{}` field format is the same as [Nodemailer](https://nodemailer.com/about/) library syntax.
Right now, alert emitted are :
- `NOT_VALIDATOR` the validator account `validatorAccountId` (`poolAccountId`) is not in the validators list for current epoch.
- `VALIDATOR_EXPECTED_PRODUCED_BLOCKS` is triggered when a validator produced only 95% (or less) of the expected blocks.
- `VALIDATOR_SLASHED` the validator account `validatorAccountId` (`poolAccountId`) has been slashed.
- `PROTOCOL_VERSION` your target RPC node is outdated (not reliable if you use a public RPC instead of your own node)


#### metrics{}

The following metrics are exported for *Prometheus* on `http://<yourHost>:3039/metrics` by default.
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

# HELP suricate_seat_price_proposals suricate_seat_price_proposals
# TYPE suricate_seat_price_proposals gauge
suricate_seat_price_proposals 107145.27592851459

# HELP suricate_seat_price_low_threshold suricate_seat_price_low_threshold
# TYPE suricate_seat_price_low_threshold gauge
suricate_seat_price_low_threshold 149235.59898509088

# HELP suricate_seat_price_high_threshold suricate_seat_price_high_threshold
# TYPE suricate_seat_price_high_threshold gauge
suricate_seat_price_high_threshold 202534.43736531216

# HELP suricate_alerts_count suricate_alerts_count
# TYPE suricate_alerts_count gauge
suricate_alerts_count 0
```

## Bugs & Feature requests

Please use *Github*'s *issues* section. I'll be happy to try to help you.