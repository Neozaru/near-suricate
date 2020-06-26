

function c2h(value) {
  return value.toString() / Math.pow(10,24)
}

function generateProposedAction(rebalanceLevels, seatPrice, totalStakedInPool) {
  const stakeSeatPriceRatio = totalStakedInPool / seatPrice;
  if (stakeSeatPriceRatio < rebalanceLevels.lowThreshold) {
    const targetAmount = seatPrice.muln(rebalanceLevels.lowTarget);
    const diffAmount = targetAmount.sub(totalStakedInPool);
    return {
      method: 'stake',
      amount: diffAmount,
      debug: rebalanceLevels.lowTarget * seatPrice - totalStakedInPool,
      meta: `Pool stake ratio ${stakeSeatPriceRatio} (${c2h(totalStakedInPool)}) below threshold of ${rebalanceLevels.lowThreshold}. Staking ${c2h(diffAmount)} more tokens to get to target of ${rebalanceLevels.lowTarget} (${c2h(targetAmount)})`
    }
  } else if (stakeSeatPriceRatio > rebalanceLevels.highThreshold) {
    const targetAmount = seatPrice.muln(rebalanceLevels.highTarget);
    const diffAmount = totalStakedInPool.sub(targetAmount);
    return {
      method: 'unstake',
      amount: diffAmount,
      debug: totalStakedInPool - rebalanceLevels.highTarget * seatPrice,
      meta: `Pool stake ratio ${stakeSeatPriceRatio} (${c2h(totalStakedInPool)}) above threshold of ${rebalanceLevels.highThreshold}. Untaking ${c2h(diffAmount)} more tokens to get to target of ${rebalanceLevels.highTarget} (${c2h(targetAmount)})`

    }
  }
}


function generateActionToExecute(rebalancePolicy, proposedAction, warchestAccountStakedBalance, warchestAccountUnstakedBalance) {
  if (proposedAction.method === 'unstake' && warchestAccountStakedBalance.lt(proposedAction.amount)) {
    console.warn(`Rebalancing policy set to ${rebalancePolicy.type} and warchest staked balance (${c2h(warchestAccountStakedBalance)}) < proposed unstake amount (${c2h(proposedAction.amount)})`)
    if (rebalancePolicy.type === 'BEST') {
      if (warchestAccountStakedBalance.gten(rebalancePolicy.minRebalanceAmount)) {
        return {
          method: proposedAction.method,
          amount: warchestAccountStakedBalance,
        };
      }
    }
    return false;
  }
  if (proposedAction.method === 'stake' && warchestAccountUnstakedBalance.lt(proposedAction.amount)) {
    console.warn(`Rebalancing policy set to ${rebalancePolicy.type} and warchest unstaked balance (${c2h(warchestAccountUnstakedBalance)}) < proposed stake amount (${c2h(proposedAction.amount)})`)
    if (rebalancePolicy.type === 'BEST') {
      if (warchestAccountUnstakedBalance.gten(rebalancePolicy.minRebalanceAmount)) {
        return {
          method: proposedAction.method,
          amount: warchestAccountUnstakedBalance,
        };
      }
    }
    return false;
  }
  return proposedAction;
}


export {
  c2h,
  generateProposedAction,
  generateActionToExecute,
}