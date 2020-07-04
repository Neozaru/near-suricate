import { c2h } from '../utils'
import BN from 'bn.js'

function generateProposedAction(rebalanceLevels, seatPrice, totalStakedInPool): IRebalancingAction | null {
  const stakeSeatPriceRatio = totalStakedInPool / seatPrice;
  if (stakeSeatPriceRatio < rebalanceLevels.lowThreshold) {
    console.log(`Stake / Seat Price ratio (${stakeSeatPriceRatio}) below lowThreshold (${rebalanceLevels.lowThreshold})`);
    const targetAmount = seatPrice.muln(rebalanceLevels.lowTarget);
    const diffAmount = targetAmount.sub(totalStakedInPool);
    return {
      method: 'stake',
      amount: diffAmount,
    }
  } 
  if (stakeSeatPriceRatio > rebalanceLevels.highThreshold) {
    console.log(`Stake / Seat Price ratio (${stakeSeatPriceRatio}) above highThreshold (${rebalanceLevels.highThreshold})`);
    const targetAmount = seatPrice.muln(rebalanceLevels.highTarget);
    const diffAmount = totalStakedInPool.sub(targetAmount);
    return {
      method: 'unstake',
      amount: diffAmount,
    }
  }

  return null;
}

function generateActionToExecute(rebalancePolicy, proposedAction, delegatorAccountStakedBalance, delegatorAccountUnstakedBalance): IRebalancingAction | null {
  const minRebalanceAmount = (new BN(parseInt(rebalancePolicy.minRebalanceAmount))).mul(new BN(10).pow(new BN(24)));

  if (proposedAction.method === 'unstake' && delegatorAccountStakedBalance.lt(proposedAction.amount)) {
    console.warn(`Rebalancing policy set to ${rebalancePolicy.type} and delegator staked balance (${c2h(delegatorAccountStakedBalance)}) < proposed unstake amount (${c2h(proposedAction.amount)})`)
    if (rebalancePolicy.type === 'BEST') {
      if (delegatorAccountStakedBalance.gte(minRebalanceAmount)) {
        return {
          method: proposedAction.method,
          amount: delegatorAccountStakedBalance,
        };
      }
    }
    return null;
  }
  if (proposedAction.method === 'stake' && delegatorAccountUnstakedBalance.lt(proposedAction.amount)) {
    console.warn(`Rebalancing policy set to ${rebalancePolicy.type} and delegator unstaked balance (${c2h(delegatorAccountUnstakedBalance)}) < proposed stake amount (${c2h(proposedAction.amount)})`)
    if (rebalancePolicy.type === 'BEST') {
      if (delegatorAccountUnstakedBalance.gte(minRebalanceAmount)) {
        return {
          method: proposedAction.method,
          amount: delegatorAccountUnstakedBalance,
        };
      }
    }
    return null;
  }
  return proposedAction;
}

function actionToString(action: IRebalancingAction): string {
  return `${action.method} ${c2h(action.amount)}`
}

export {
  generateProposedAction,
  generateActionToExecute,
  actionToString,
}