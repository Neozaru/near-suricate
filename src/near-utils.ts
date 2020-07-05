
import * as nearApi from 'near-api-js';
import BN from 'bn.js';

interface StakingData {
  nextSeatPrice: BN,
  poolTotalStake: BN,
  poolDelegatorStakedBalance: BN,
  poolDelegatorUnstakedBalance: BN,
};

// Vigorously stolen from https://github.com/near/near-shell/blob/6a233cc59a1d1e83ccdbe5eabcefdda9741caf9f/utils/validators-info.js
async function validatorsInfo(near, epochId) {
  const genesisConfig = await near.connection.provider.sendJsonRpc('EXPERIMENTAL_genesis_config', {});
  const result = await near.connection.provider.sendJsonRpc('validators', [epochId]);
  result.genesisConfig = genesisConfig;
  result.numSeats = genesisConfig.num_block_producer_seats + genesisConfig.avg_hidden_validator_seats_per_shard.reduce((a, b) => a + b);
  return result;
}

function reqNextSeatPrice(near) {
  return validatorsInfo(near, null).then((validatorsRes) => {
    return nearApi.validators.findSeatPrice(validatorsRes.next_validators, validatorsRes.numSeats);
  }); 
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

function executeStakeUnstakeAction(account, action, contractId) {
  return account.functionCall(contractId, action.method, {amount: action.amount.toString()})
}

function fetchStakingData(near, account, poolAccountId, delegatorAccountId): Promise<StakingData> {
  return Promise.all([
    reqNextSeatPrice(near),
    reqPoolGetTotalStakedBalance(account, poolAccountId),
    reqPoolGetAccountStakedBalance(account, delegatorAccountId, poolAccountId),
    reqPoolGetAccountUnstakedBalance(account, delegatorAccountId, poolAccountId)
  ])
  .then(([nextSeatPrice, poolTotalStake, poolDelegatorStakedBalance, poolDelegatorUnstakedBalance]) => {
    return {
      nextSeatPrice,
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
  executeStakeUnstakeAction,
  generateConnectionConfig,
  validatorsInfo,
  StakingData,
}