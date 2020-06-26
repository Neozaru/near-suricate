
import {
  reqNextSeatPrice,
  reqPoolGetTotalStakedBalance,
  reqPoolGetAccountStakedBalance,
  reqPoolGetAccountUnstakedBalance,
  executeStakeUnstakeAction
} from './near-utils';

import {
  c2h,
  generateProposedAction,
  generateActionToExecute,
} from './utils';

export default class WarchestBot {

  constructor(private near, private config) {}

  public async rebalance() {
    const {near, config} = this;
  
    const account = await near.account(config.warchestAccountId)
  
    Promise.all([
      reqNextSeatPrice(near),
      reqPoolGetTotalStakedBalance(account, config.poolAccountId),
    ]).then(([seatPrice, poolStake]) => {
      console.log('seatPrice', c2h(seatPrice), 'poolStake', c2h(poolStake), 'accountPoolStake', 'ratio', poolStake.div(seatPrice))
      const proposedAction = generateProposedAction(config.rebalanceLevels, seatPrice, poolStake)
      if (!proposedAction) {
        console.log('Not action proposed. Everything seems to be all right.')
        return;
      }
      console.log('Proposed action : ', proposedAction);
      console.log('Checking if Warchest can perform the action');
      Promise.all([
        reqPoolGetAccountStakedBalance(account, config.warchestAccountId, config.poolAccountId),
        reqPoolGetAccountUnstakedBalance(account, config.warchestAccountId, config.poolAccountId)
      ]).then(([warchestAccountStakedBalance, warchestAccountUnstakedBalance]) => {
        console.log('wc staked', c2h(warchestAccountStakedBalance), 'wc unstaked', c2h(warchestAccountUnstakedBalance))
        const actionToExecute = generateActionToExecute(config.rebalancePolicy, proposedAction, warchestAccountStakedBalance, warchestAccountUnstakedBalance);
        if (!actionToExecute) {
          console.warn(`Won't execute proposed action : ${proposedAction.method} with amount ${c2h(proposedAction.amount)}`) 
          return;
        }
        console.log(`Executing action ${actionToExecute.method} with amount ${c2h(actionToExecute.amount)}`);
        executeStakeUnstakeAction(account, actionToExecute, config.poolAccountId)
        .then((res) => {
          console.log('Action executed');
          reqPoolGetTotalStakedBalance(account, config.poolAccountId)
          .then(newPoolStake => {
            console.log('New stake in pool', c2h(newPoolStake), 'New ratio', newPoolStake.div(seatPrice));
          });
        })
        .catch((err) => {
          console.error('Error while executing action', err);
        });
      })
  
    })
  }
  

}