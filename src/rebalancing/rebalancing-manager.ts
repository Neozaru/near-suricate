import { createLoggerWithLabel } from "../logger-factory";
import { fetchStakingData, reqSeatPrices, executePing, executeStakeUnstakeAction } from "../near-utils";
import { c2h } from "../utils";
import { generateProposedAction, generateActionToExecute, actionToString } from "./stake-unstake-actions";


export default class RebalancingManager {

  logger = createLoggerWithLabel('Rebalancing');

  constructor(private near, private rebalancingConfig) {}

  private async refreshStakingData(account) {
    const {rebalancingConfig, logger} = this;
    if (rebalancingConfig.autoping) {
      logger.log('info', `Ping-ing ${rebalancingConfig.validatorAccountId}...`)
      await executePing(account, rebalancingConfig.validatorAccountId, rebalancingConfig.delegatorAccountId);
    }
    logger.log('info', `Fetching staking data ${rebalancingConfig.validatorAccountId}...`)
    return fetchStakingData(account, rebalancingConfig.validatorAccountId, rebalancingConfig.delegatorAccountId);
  }

  private rebalancingReport(stakingData: any, proposedAction?: IRebalancingAction, actionToExecute?: IRebalancingAction, executionError?: any) {
    const actionExecuted: boolean = !!actionToExecute && !executionError;
    return Promise.resolve({
      stakingData,
      proposedAction,
      actionToExecute,
      result: {
        actionExecuted,
        error: executionError
      }
    });
  }

  public async checkAndRebalanceStakeForAccount(account) {
    const {near, rebalancingConfig, logger} = this;

    logger.log('info', 'Starting refresh...');
    const stakingData = await this.refreshStakingData(account);
    const seatPrices = await reqSeatPrices(near);
    logger.log('info', `current seatPrice ${c2h(seatPrices.current)}, next seatPrice ${c2h(seatPrices.next)}, proposals seatPrice ${c2h(seatPrices.proposals)} poolStake ${c2h(stakingData.poolTotalStake)}, ratio ${c2h(stakingData.poolTotalStake)/c2h(seatPrices.next)} (desired range : [${rebalancingConfig.levels.lowThreshold}, ${rebalancingConfig.levels.highThreshold}])`);
    const proposedAction = generateProposedAction(rebalancingConfig.levels, seatPrices.next, stakingData.poolTotalStake);
    if (!proposedAction) {
      logger.log('info', 'Current pool stake is conform to requirements. No action proposed.');
      return this.rebalancingReport(stakingData);
    }
    logger.log('warn', `Proposed action : ${actionToString(proposedAction)}`);
    const actionToExecute = generateActionToExecute(rebalancingConfig.policy, proposedAction, stakingData.poolDelegatorStakedBalance, stakingData.poolDelegatorUnstakedBalance);
    if (!actionToExecute) {
      logger.log('warn', `Won't execute proposed action : ${actionToString(proposedAction)}`) 
      return this.rebalancingReport(stakingData, proposedAction);
    }
    logger.log('info', `Executing action : ${actionToString(proposedAction)}`)
    return executeStakeUnstakeAction(account, actionToExecute, rebalancingConfig.validatorAccountId)
    .then(async () => {
      const newStakingData = await this.refreshStakingData(account);
      logger.log('info', `poolStake ${c2h(newStakingData.poolTotalStake)}, ratio ${c2h(newStakingData.poolTotalStake)/c2h(seatPrices.next)} (desired range : [${rebalancingConfig.levels.lowThreshold}, ${rebalancingConfig.levels.highThreshold}])`);
      return this.rebalancingReport(newStakingData, proposedAction, actionToExecute);
    })
    .catch(err => {
      logger.log('error', 'Error while executing action', err);
      return this.rebalancingReport(stakingData, proposedAction, actionToExecute, err);
    });
  }

}