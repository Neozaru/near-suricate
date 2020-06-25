

const nearApi = require('near-api-js');
const BN = require('bn.js');
const moment = require('moment')

// console.log(nearApi)
// configure network settings and key storage
const config = {
  nodeUrl: 'https://rpc.betanet.near.org',
  networkId: 'betanet',
  deps: {
    keyStore: new nearApi.keyStores.UnencryptedFileSystemKeyStore('./neardev')
  }
};

// // open a connection to the NEAR platform
// (async function() {
//   global.

//   // ---------------------------------------------------------------------------
//   // here you have access to `near-api-js` and a valid connection object `near`
//   // ---------------------------------------------------------------------------

// })(global)

// Vigorously stolen from https://github.com/near/near-shell/blob/6a233cc59a1d1e83ccdbe5eabcefdda9741caf9f/utils/validators-info.js
async function validatorsInfo(near, epochId) {
  const genesisConfig = await near.connection.provider.sendJsonRpc('EXPERIMENTAL_genesis_config', {});
  const result = await near.connection.provider.sendJsonRpc('validators', [epochId]);
  result.genesisConfig = genesisConfig;
  result.numSeats = genesisConfig.num_block_producer_seats + genesisConfig.avg_hidden_validator_seats_per_shard.reduce((a, b) => a + b);
  return result;
}

const seatBalanceConfig = {
  // targetRatio: 1.5,
  // thresholdRatios: {
    checkInterval: 600,
    lowThreshold: 1.1,
    lowTarget: 1.2,
    highTarget: 1.8,
    highThreshold: 1.9,
  // },
}

function c2h(value) {
  return value / Math.pow(10,24)
} 

function generateAction(seatBalanceConfig, seatPrice, stakedInPool, stakedByWarchest) {
  // console.log('args', arguments)
  const stakeSeatPriceRatio = stakedInPool / seatPrice;
  // const targetPoolStake = seatBalanceConfig.targetRatio * seatPrice;
  // console.log('stakeSeatPriceRatio', stakeSeatPriceRatio)
  // const psycho = new BN((seatBalanceConfig.thresholdRatios.low*100))
  // console.log('seatBalanceConfig.thresholdRatios.low', seatBalanceConfig.thresholdRatios.low,seatBalanceConfig.thresholdRatios.low * seatPrice)
  if (stakeSeatPriceRatio < seatBalanceConfig.lowThreshold) {
    const targetAmount = seatPrice.muln(seatBalanceConfig.lowTarget);
    const diffAmount = targetAmount.isub(stakedInPool).toString();
    return {
      method: 'stake',
      amount: diffAmount,
      debug: seatBalanceConfig.lowTarget * seatPrice - stakedInPool,
      meta: `Pool stake ratio ${stakeSeatPriceRatio} (${c2h(stakedInPool)}) below threshold of ${seatBalanceConfig.lowThreshold}. Staking ${c2h(diffAmount)} more tokens to get to target of ${seatBalanceConfig.lowTarget} (${c2h(targetAmount)})`
    }
    // console.log('PROPOSAL', res)
    // return res;
  } else if (stakeSeatPriceRatio > seatBalanceConfig.highThreshold) {
    const targetAmount = seatPrice.muln(seatBalanceConfig.highTarget);
    const diffAmount = stakedInPool.sub(targetAmount).toString();
    return {
      method: 'unstake',
      amount: diffAmount,
      debug: stakedInPool - seatBalanceConfig.highTarget * seatPrice,
      meta: `Pool stake ratio ${stakeSeatPriceRatio} (${c2h(stakedInPool)}) above threshold of ${seatBalanceConfig.highThreshold}. Untaking ${c2h(diffAmount)} more tokens to get to target of ${seatBalanceConfig.highTarget} (${c2h(targetAmount)})`

    }
    // console.log('PROPOSAL', res)
    // return res;
  }
}

function reqSeatPrice(near) {
  return validatorsInfo(near, null).then((validatorsRes) => {

    const seatPrice = nearApi.validators.findSeatPrice(validatorsRes.current_validators, validatorsRes.numSeats)
    // console.log('validatorsRes.current_validators', validatorsRes.current_validators.length, validatorsRes.numSeats)
    // console.log('seat Price', seatPrice.toString(), nearApi.utils.format.formatNearAmount(seatPrice, 0))
    return seatPrice
  }) // null == Next epoch, not current
  // console.log('validators', validatorsRes)
}

// function reqPoolStake(near) {
//   return near.connection.provider.query(`account/neozaru.stakehouse.betanet`, "").then((poolState) => {
//     return new BN(poolState.locked);
//   })
// }

function reqPoolStake(account, poolId) {
  return account.viewFunction(poolId, 'get_total_staked_balance', null).then((res) => new BN(res))
}

function reqAccountStakedBalance(account, accountId, poolId) {
  return account.viewFunction(poolId, 'get_account_staked_balance', {account_id: accountId}).then((res) => new BN(res))
}

function executeAction(account, action, contractId) {
  return account.functionCall(contractId, action.method, {amount: action.amount})
}

const ACCOUNT_ID = 'neozaru14.betanet';
const POOL_ID = 'neozaru.stakehouse.betanet';

async function rebalance() {
  console.log(moment().format() + ' - Rebalancing');

  const near = await nearApi.connect(config);
  const account = await near.account(ACCOUNT_ID)

  Promise.all([
    reqSeatPrice(near),
    reqPoolStake(account, POOL_ID),
    reqAccountStakedBalance(account, ACCOUNT_ID, POOL_ID)
  ]).then(([seatPrice, poolStake, accountPoolStake]) => {
    console.log('seatPrice', seatPrice.toString(), 'poolStake', poolStake.toString(), 'accountPoolStake', accountPoolStake.toString())
    const proposedAction = generateAction(seatBalanceConfig, seatPrice, poolStake, accountPoolStake)
    if (!proposedAction) {
      console.log('Not action proposed. Everything seems to be all right.')
      return;
    }
    console.log('Proposed action : ', proposedAction);
    executeAction(account, proposedAction, POOL_ID)
    .then((res) => {
      console.log('Action executed');
      reqPoolStake(account, POOL_ID)
      .then(newPoolStake => {
        console.log('New stake in pool', newPoolStake.toString());
      });
    })
    .catch((err) => {
      console.error('Error while executing action', err);
    });
  })
}

async function main() {
  rebalance()
}

async function listen() {
  rebalance();
  setInterval(() => {
    rebalance();
  }, seatBalanceConfig.checkInterval * 1000)
}
const [nodeproc, procname, action] = process.argv
console.log(process.argv)
if (action && action == 'listen') {
  console.log('Listening')
  listen()
} else {
  main();
}
