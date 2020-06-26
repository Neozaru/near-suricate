DISCLAIMER : Proof of concept developed in the context of the NEAR stakewars competition (challenge004).
Hard configured for betanet (for now).
Published a l'arrache so I can submit the challenge and enjoy my Saturday =*

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
Compile
```
npm run tsc
```
Run (will check/rebalance once)
```
node dist/index.js
```
Run (will check/rebalance every `watchInterval` -- see config below)
```
node dist/index.js --watch
```

## Configuring
Copy the configuration file example.
```
cp warchest-bot.config.json.example warchest-bot.config.json
```
And modify it according to your needs :
```
{
  "nearKeystoreDir": "./neardev",
  "warchestAccountId": "neozaru14.betanet",
  "poolAccountId": "neozaru.stakehouse.betanet",
  "watchInterval": 300,
  "rebalanceLevels": {
    "lowThreshold": 1.1,
    "lowTarget": 1.2,
    "highTarget": 1.8,
    "highThreshold": 1.9
  },
  "rebalancePolicy": {
    "type": "BEST",
    "minRebalanceAmount": "1000000000000000000000000000"
  }

}
```
- `nearKeyStoreDir` should have the same structure as your `~/.near-credentials/` folder (you can actually set it to this folder). It should contain at least of keys associated with `warchestAccountId`.
- `watchInterval` is the time to wait (in seconds) between checks/rebalancing.
- `rebalanceLevels` defines at what levels (`lowThreshold`, `highThreshold`) the automatic rebalancing should be triggered and to what levels (`lowTarget`, `highTarget`) it should put the stake by rebalancing.
Ex: If current seat price is 1000 and the currently staked balance in the pool is 1950, it will trigger the `highThreshold` (1950 > 1000 * `1.9`) and take action to set the staked balance in the pool to 1800 (`1.8` * 1000).
- `rebalancePolicy` defines what to do when the warchest account does have enough fund deposited in the pool to meet the stake/unstake target. Setting the type to `BEST` will make the warchest account stake/unstake as many tokens as it can even if it is not enough to meet the `lowTarget`/`highTarget`. It is triggered only if the user can stake/unstake at least `minRebalanceAmount`.

Another option for `rebalancePolicy` is FOK, which simply doesn't take any action if the warchest account doesn't have enough fund deposited :
```
"rebalancePolicy": {
  "type": "FOK"
}
```
