import { createLoggerWithLabel } from "../logger-factory";
import { fetchStakingData, executeStakeUnstakeAction } from "../near-utils";
import { c2h } from "../utils";
import { generateProposedAction, generateActionToExecute, actionToString } from "./stake-unstake-actions";


export default class RebalancingManager {

  logger = createLoggerWithLabel('Rebalancing');

  constructor(private near, private rebalancingConfig) {}

  private async refreshStakingData(account) {
    const {near, rebalancingConfig, logger} = this;

    const data = await fetchStakingData(near, account, rebalancingConfig.validatorAccountId, rebalancingConfig.delegatorAccountId);
    logger.log('info', `seatPrice ${c2h(data.nextSeatPrice)}, poolStake ${c2h(data.poolTotalStake)}, ratio ${c2h(data.poolTotalStake)/c2h(data.nextSeatPrice)} (desired range : [${rebalancingConfig.levels.lowThreshold}, ${rebalancingConfig.levels.highThreshold}])`);
    return data;
  }

  public async checkAndRebalanceStakeForAccount(account) {
    const {rebalancingConfig, logger} = this;

    logger.log('info', 'Starting refresh...')
    const data = await this.refreshStakingData(account);
    const proposedAction = generateProposedAction(rebalancingConfig.levels, data.nextSeatPrice, data.poolTotalStake);
    if (!proposedAction) {
      logger.log('info', 'Current pool stake is conform to requirements. No action proposed.');
      return;
    }
    logger.log('warn', `Proposed action : ${actionToString(proposedAction)}`);
    const actionToExecute = generateActionToExecute(rebalancingConfig.policy, proposedAction, data.poolDelegatorStakedBalance, data.poolDelegatorUnstakedBalance);
    if (!actionToExecute) {
      logger.log('warn', `Won't execute proposed action : ${actionToString(proposedAction)}`) 
      return;
    }
    logger.log('info', `Executing action : ${actionToString(proposedAction)}`)
    executeStakeUnstakeAction(account, actionToExecute, rebalancingConfig.validatorAccountId)
    .then(() => this.refreshStakingData(account))
    .catch(err => logger.log('error', 'Error while executing action', err));
  }

}