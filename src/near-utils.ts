
import * as nearApi from 'near-api-js';
import BN from 'bn.js';

interface SeatPrices {
  current: BN, next: BN, proposals: BN
}

interface StakingData {
  poolTotalStake: BN,
  poolDelegatorStakedBalance: BN,
  poolDelegatorUnstakedBalance: BN,
};

// Vigorously stolen from https://github.com/near/near-shell/blob/6a233cc59a1d1e83ccdbe5eabcefdda9741caf9f/utils/validators-info.js
async function reqValidatorsInfo(near, epochId) {
  const genesisConfig = await near.connection.provider.sendJsonRpc('EXPERIMENTAL_genesis_config', {});
  const result = await near.connection.provider.sendJsonRpc('validators', [epochId]);
  result.genesisConfig = genesisConfig;
  result.numSeats = genesisConfig.num_block_producer_seats + genesisConfig.avg_hidden_validator_seats_per_shard.reduce((a, b) => a + b);
  return result;
}

function combineValidatorsAndProposals(currentValidators, proposals) {
  let currentValidatorsMap = new Map();
  currentValidators.forEach((v) => currentValidatorsMap.set(v.account_id, v));
  let proposalsMap = new Map();
  proposals.forEach((p) => proposalsMap.set(p.account_id, p));
  // TODO: filter out all kicked out validators.
  let result = currentValidators.filter((validator) => !proposalsMap.has(validator.account_id));
  
  return result.concat([...proposalsMap.values()]);
}

function reqSeatPrices(near): Promise<SeatPrices> {
  return reqValidatorsInfo(near, null).then(computeSeatPricesFromValidatorsInfo); 
}

function computeSeatPricesFromValidatorsInfo(validatorsInfo): SeatPrices {
  return {
    next: nearApi.validators.findSeatPrice(validatorsInfo.next_validators, validatorsInfo.numSeats),
    current: nearApi.validators.findSeatPrice(validatorsInfo.current_validators, validatorsInfo.numSeats),
    // Proposals seat price doesn't filter out kicked validators for estimate. This is incorrect but consistent will near-shell calculation (as of 09 Jul 2020).
    proposals: nearApi.validators.findSeatPrice(combineValidatorsAndProposals(validatorsInfo.current_validators, validatorsInfo.current_proposals), validatorsInfo.numSeats)
  };
}

function reqPoolGetTotalStakedBalance(account, poolAccountId) {
  return account.viewFunction(poolAccountId, 'get_total_staked_balance', null).then((res) => new BN(res))
}

function reqPoolGetAccountStakedBalance(account, accountId, poolAccountId) {
  return account.viewFunction(poolAccountId, 'get_account_staked_balance', {account_id: accountId}).then((res) => new BN(res))
}

function reqPoolGetAccountUnstakedBalance(account, accountId, poolAccountId) {
  return account.viewFunction(poolAccountId, 'get_account_unstaked_balance', {account_id: accountId}).then((res) => new BN(res))
}

function executePing(account, poolAccountId, delegatorAccountId) {
  return account.functionCall(poolAccountId, 'ping', {account_id: delegatorAccountId})
}

function executeStakeUnstakeAction(account, action, contractId) {
  return account.functionCall(contractId, action.method, {amount: action.amount.toString()})
}

function fetchStakingData(account, poolAccountId, delegatorAccountId): Promise<StakingData> {
  return Promise.all([
    reqPoolGetTotalStakedBalance(account, poolAccountId),
    reqPoolGetAccountStakedBalance(account, delegatorAccountId, poolAccountId),
    reqPoolGetAccountUnstakedBalance(account, delegatorAccountId, poolAccountId)
  ])
  .then(([poolTotalStake, poolDelegatorStakedBalance, poolDelegatorUnstakedBalance]) => {
    return {
      poolTotalStake,
      poolDelegatorStakedBalance,
      poolDelegatorUnstakedBalance
    };
  })

}

function generateConnectionConfig(nearConfig) {
  return {
    nodeUrl: nearConfig.nodeUrl || 'https://rpc.betanet.near.org',
    networkId: nearConfig.networkId || 'betanet',
    deps: {
      keyStore: new nearApi.keyStores.UnencryptedFileSystemKeyStore(nearConfig.keystoreDir || undefined)
    }
  };
}

export {
  fetchStakingData,
  executePing,
  executeStakeUnstakeAction,
  generateConnectionConfig,
  reqValidatorsInfo,
  reqSeatPrices,
  StakingData,
}