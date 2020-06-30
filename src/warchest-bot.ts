
import {
  executeStakeUnstakeAction,
  fetchStakingData,
} from './near-utils';

import {
  c2h,
} from './utils';

import {
  createLogger
} from './logger-factory';

import {
  actionToString,
  generateProposedAction,
  generateActionToExecute,
} from './stake-unstake-actions';
import PrometheusExporter from './prometheus-exporter';

export default class WarchestBot {

  private prometheusExporter;
  logger = createLogger()

  constructor(private near, private config) {}

  private initializeMetricsExporter() {
    const {config, logger} = this;

    const port = config.metrics.port || 3039;
    const hostname = config.metrics.hostname || '0.0.0.0';
    logger.log('info', `Initializing Promotheus exporter on  ${hostname}:${port}`);
    this.prometheusExporter = new PrometheusExporter(config.metrics);
    this.prometheusExporter.serve(port, hostname);
  }

  private async refreshStakingData(account) {
    const {near, config, logger} = this;

    const data = await fetchStakingData(near, account, config.poolAccountId, config.warchestAccountId);
    logger.log('info', `seatPrice ${c2h(data.nextSeatPrice)}, poolStake ${c2h(data.poolTotalStake)}, ratio ${c2h(data.poolTotalStake)/c2h(data.nextSeatPrice)}`);
    this.prometheusExporter && this.prometheusExporter.feed({
      ...data,
      lowThresholdSeatPrice: data.nextSeatPrice.muln(config.rebalancing.levels.lowThreshold),
      highThresholdSeatPrice: data.nextSeatPrice.muln(config.rebalancing.levels.highThreshold),
    })
    return data;
  }

  private async checkAndRebalanceStakeForAccount(account) {
    const {config, logger} = this;

    logger.log('info', 'Starting refresh...')
    const data = await this.refreshStakingData(account);
    const proposedAction = generateProposedAction(config.rebalancing.levels, data.nextSeatPrice, data.poolTotalStake);
    if (!proposedAction) {
      logger.log('info', 'Current pool stake is conform to requirements. No action proposed.');
      return;
    } 
    const actionToExecute = generateActionToExecute(config.rebalancing.policy, proposedAction, data.poolWarchestStakedBalance, data.poolWarchestUnstakedBalance);
    if (!actionToExecute) {
      logger.log('warn', `Won't execute proposed action : ${actionToString(proposedAction)}`) 
      return;
    }
    executeStakeUnstakeAction(account, actionToExecute, config.poolAccountId)
    .then(() => this.refreshStakingData(account))
    .catch(err => logger.log('error', 'Error while executing action', err));
  }

  
  public async checkAndRebalanceStakeOnce() {
    const {near, config} = this;

    const account = await near.account(config.warchestAccountId);
    this.checkAndRebalanceStakeForAccount(account);
  }


  public async startMonitoring(interval: number) {
    const {near, config} = this;

    this.logger.log('info', `Started in monitoring mode. Will export metrics and rebalance every ${interval / 1000} seconds.`)
    this.initializeMetricsExporter();
    const account = await near.account(config.warchestAccountId);
    this.checkAndRebalanceStakeForAccount(account);
    setInterval(() => {
      this.checkAndRebalanceStakeForAccount(account)
    }, interval);
  }

}