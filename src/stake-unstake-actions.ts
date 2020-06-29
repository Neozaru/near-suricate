import { c2h, nearToYocta } from './utils'

type StakeUnstakeAction = {
  method: string,
  amount: string,
};

function generateProposedAction(rebalanceLevels, seatPrice, totalStakedInPool): StakeUnstakeAction | null {
  const stakeSeatPriceRatio = totalStakedInPool / seatPrice;
  if (stakeSeatPriceRatio < rebalanceLevels.lowThreshold) {
    const targetAmount = seatPrice.muln(rebalanceLevels.lowTarget);
    const diffAmount = targetAmount.sub(totalStakedInPool);
    return {
      method: 'stake',
      amount: diffAmount,
    }
  } 
  if (stakeSeatPriceRatio > rebalanceLevels.highThreshold) {
    const targetAmount = seatPrice.muln(rebalanceLevels.highTarget);
    const diffAmount = totalStakedInPool.sub(targetAmount);
    return {
      method: 'unstake',
      amount: diffAmount,
    }
  }

  return null;
}

function generateActionToExecute(rebalancePolicy, proposedAction, warchestAccountStakedBalance, warchestAccountUnstakedBalance): StakeUnstakeAction | null {
  const minRebalanceAmount = nearToYocta(rebalancePolicy.minRebalanceAmount);
  if (proposedAction.method === 'unstake' && warchestAccountStakedBalance.lt(proposedAction.amount)) {
    console.warn(`Rebalancing policy set to ${rebalancePolicy.type} and warchest staked balance (${c2h(warchestAccountStakedBalance)}) < proposed unstake amount (${c2h(proposedAction.amount)})`)
    if (rebalancePolicy.type === 'BEST') {
      if (warchestAccountStakedBalance.gten(minRebalanceAmount)) {
        return {
          method: proposedAction.method,
          amount: warchestAccountStakedBalance,
        };
      }
    }
    return null;
  }
  if (proposedAction.method === 'stake' && warchestAccountUnstakedBalance.lt(proposedAction.amount)) {
    console.warn(`Rebalancing policy set to ${rebalancePolicy.type} and warchest unstaked balance (${c2h(warchestAccountUnstakedBalance)}) < proposed stake amount (${c2h(proposedAction.amount)})`)
    if (rebalancePolicy.type === 'BEST') {
      if (warchestAccountUnstakedBalance.gten(minRebalanceAmount)) {
        return {
          method: proposedAction.method,
          amount: warchestAccountUnstakedBalance,
        };
      }
    }
    return null;
  }
  return proposedAction;
}

function actionToString(action: StakeUnstakeAction): string {
  return `${action.method} ${c2h(action.amount)}`
}

export {
  generateProposedAction,
  generateActionToExecute,
  actionToString,
}