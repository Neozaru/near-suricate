

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
    rebalancePolicy: {
      type: 'BEST',
      minRebalanceAmount: '1000000000000000000000000000'
    },
    checkInterval: 300,
    lowThreshold: 1.1,
    lowTarget: 1.2,
    highTarget: 1.8,
    highThreshold: 1.9,
}

function c2h(value) {
  return value.toString() / Math.pow(10,24)
} 

function generateProposedAction(seatBalanceConfig, seatPrice, totalStakedInPool) {
  // console.log('args', arguments)
  const stakeSeatPriceRatio = totalStakedInPool / seatPrice;
  // const targetPoolStake = seatBalanceConfig.targetRatio * seatPrice;
  // console.log('stakeSeatPriceRatio', stakeSeatPriceRatio)
  // const psycho = new BN((seatBalanceConfig.thresholdRatios.low*100))
  // console.log('seatBalanceConfig.thresholdRatios.low', seatBalanceConfig.thresholdRatios.low,seatBalanceConfig.thresholdRatios.low * seatPrice)
  if (stakeSeatPriceRatio < seatBalanceConfig.lowThreshold) {
    const targetAmount = seatPrice.muln(seatBalanceConfig.lowTarget);
    const diffAmount = targetAmount.sub(totalStakedInPool);
    return {
      method: 'stake',
      amount: diffAmount,
      debug: seatBalanceConfig.lowTarget * seatPrice - totalStakedInPool,
      meta: `Pool stake ratio ${stakeSeatPriceRatio} (${c2h(totalStakedInPool)}) below threshold of ${seatBalanceConfig.lowThreshold}. Staking ${c2h(diffAmount)} more tokens to get to target of ${seatBalanceConfig.lowTarget} (${c2h(targetAmount)})`
    }
    // console.log('PROPOSAL', res)
    // return res;
  } else if (stakeSeatPriceRatio > seatBalanceConfig.highThreshold) {
    const targetAmount = seatPrice.muln(seatBalanceConfig.highTarget);
    const diffAmount = totalStakedInPool.sub(targetAmount);
    return {
      method: 'unstake',
      amount: diffAmount,
      debug: totalStakedInPool - seatBalanceConfig.highTarget * seatPrice,
      meta: `Pool stake ratio ${stakeSeatPriceRatio} (${c2h(totalStakedInPool)}) above threshold of ${seatBalanceConfig.highThreshold}. Untaking ${c2h(diffAmount)} more tokens to get to target of ${seatBalanceConfig.highTarget} (${c2h(targetAmount)})`

    }
    // console.log('PROPOSAL', res)
    // return res;
  }
}

// function generateActionToExecuteFOK(proposedAction, warchestAccountStakedBalance, warchestAccountUnstakedBalance) {
//   if (proposedAction.method === 'unstake' && warchestAccountStakedBalance < proposedAction.amount) {
//     console.warn(`Rebalancing policy set to ${seatBalanceConfig.rebalancePolicy.type} and warchest staked balance (${c2h(warchestAccountStakedBalance)}) < proposed unstake amount (${c2h(proposedAction.amount)})`)
//     return false;
//   }
//   if (proposedAction.method === 'stake' && warchestAccountUnstakedBalance < proposedAction.amount) {
//     console.warn(`Rebalancing policy set to ${seatBalanceConfig.rebalancePolicy.type} and warchest unstaked balance (${c2h(warchestAccountUnstakedBalance)}) < proposed stake amount (${c2h(proposedAction.amount)})`)
//     return false;
//   }
//   return proposedAction;

// }

function generateActionToExecute(seatBalanceConfig, proposedAction, warchestAccountStakedBalance, warchestAccountUnstakedBalance) {
  if (proposedAction.method === 'unstake' && warchestAccountStakedBalance.lt(proposedAction.amount)) {
    console.warn(`Rebalancing policy set to ${seatBalanceConfig.rebalancePolicy.type} and warchest staked balance (${c2h(warchestAccountStakedBalance)}) < proposed unstake amount (${c2h(proposedAction.amount)})`)
    if (seatBalanceConfig.rebalancePolicy.type === 'BEST') {
      if (warchestAccountStakedBalance >= seatBalanceConfig.rebalancePolicy.minRebalanceAmount) {
        // console.log(`Executing best possible action ${proposedAction.method} with amount ${c2h(warchestAccountStakedBalance)}`) 
        return {
          method: proposedAction.method,
          amount: warchestAccountStakedBalance,
        };
      }
    }
    return false;
  }
  if (proposedAction.method === 'stake' && warchestAccountUnstakedBalance.lt(proposedAction.amount)) {
    console.warn(`Rebalancing policy set to ${seatBalanceConfig.rebalancePolicy.type} and warchest unstaked balance (${c2h(warchestAccountUnstakedBalance)}) < proposed stake amount (${c2h(proposedAction.amount)})`)
    if (seatBalanceConfig.rebalancePolicy.type === 'BEST') {
      if (warchestAccountUnstakedBalance >= seatBalanceConfig.rebalancePolicy.minRebalanceAmount) {
        // console.log(`Executing best possible action ${proposedAction.method} with amount ${c2h(warchestAccountUnstakedBalance)}`) 
        return {
          method: proposedAction.method,
          amount: warchestAccountUnstakedBalance,
        };
      }
    }
    return false;
  }
  return proposedAction;
  // if (seatBalanceConfig.rebalancePolicy.type === 'FOK') {
  //   return generateActionToExecuteFOK(proposedAction, warchestAccountStakedBalance, warchestAccountUnstakedBalance);
  // } else if (seatBalanceConfig.rebalancePolicy.type === 'BEST') {

  // }
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


function reqPoolGetTotalStakedBalance(account, poolId) {
  return account.viewFunction(poolId, 'get_total_staked_balance', null).then((res) => new BN(res))
}

function reqPoolGetAccountStakedBalance(account, accountId, poolId) {
  return account.viewFunction(poolId, 'get_account_staked_balance', {account_id: accountId}).then((res) => new BN(res))
}

function reqPoolGetAccountUnstakedBalance(account, accountId, poolId) {
  return account.viewFunction(poolId, 'get_account_unstaked_balance', {account_id: accountId}).then((res) => new BN(res))
}

function executeAction(account, action, contractId) {
  return account.functionCall(contractId, action.method, {amount: action.amount.toString()})
}

const ACCOUNT_ID = 'neozaru14.betanet';
const POOL_ID = 'neozaru.stakehouse.betanet';

async function rebalance() {
  console.log(moment().format() + ' - Rebalancing');
  // console.log(seatBalanceConfig)

  const near = await nearApi.connect(config);
  const account = await near.account(ACCOUNT_ID)

  Promise.all([
    reqSeatPrice(near),
    reqPoolGetTotalStakedBalance(account, POOL_ID),
    
  ]).then(([seatPrice, poolStake]) => {
    console.log('seatPrice', c2h(seatPrice), 'poolStake', c2h(poolStake), 'accountPoolStake', 'ratio', poolStake / seatPrice)
    const proposedAction = generateProposedAction(seatBalanceConfig, seatPrice, poolStake)
    if (!proposedAction) {
      console.log('Not action proposed. Everything seems to be all right.')
      return;
    }
    console.log('Proposed action : ', proposedAction);
    console.log('Checking if Warchest can perform the action');
    Promise.all([
      reqPoolGetAccountStakedBalance(account, ACCOUNT_ID, POOL_ID),
      reqPoolGetAccountUnstakedBalance(account, ACCOUNT_ID, POOL_ID)
    ]).then(([warchestAccountStakedBalance, warchestAccountUnstakedBalance]) => {
      console.log('wc staked', c2h(warchestAccountStakedBalance), 'wc unstaked', c2h(warchestAccountUnstakedBalance))
      const actionToExecute = generateActionToExecute(seatBalanceConfig, proposedAction, warchestAccountStakedBalance, warchestAccountUnstakedBalance);
      if (!actionToExecute) {
        console.warn(`Won't execute proposed action : ${proposedAction.method} with amount ${c2h(proposedAction.amount)}`) 
        return;
      }
      console.log(`Executing action ${actionToExecute.method} with amount ${c2h(actionToExecute.amount)}`);
      executeAction(account, actionToExecute, POOL_ID)
      .then((res) => {
        console.log('Action executed');
        reqPoolGetTotalStakedBalance(account, POOL_ID)
        .then(newPoolStake => {
          console.log('New stake in pool', h2c(newPoolStake), 'New ratio', newPoolStake / seatPrice);
        });
      })
      .catch((err) => {
        console.error('Error while executing action', err);
      });
    })

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
// console.log(process.argv)
if (action && action == 'listen') {
  console.log('Listening')
  listen()
} else {
  main();
}
