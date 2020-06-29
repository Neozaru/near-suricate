import winston from 'winston';

import {
  reqNextSeatPrice,
  reqPoolGetTotalStakedBalance,
  reqPoolGetAccountStakedBalance,
  reqPoolGetAccountUnstakedBalance,
  executeStakeUnstakeAction
} from './near-utils';

import {
  c2h,
} from './utils';

import {
  actionToString,
  generateProposedAction,
  generateActionToExecute,
} from './stake-unstake-actions';
import PrometheusExporter from './prometheus-exporter';

export default class WarchestBot {

  private prometheusExporter;
  logger = winston.createLogger({
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({filename: 'warchest.log'})
    ],
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    )
  });

  constructor(private near, private config) {
    this.prometheusExporter = new PrometheusExporter(config);
    this.prometheusExporter.serve();
  }

  public async rebalance() {
    const {near, config, logger} = this;

    logger.log('info', 'Warchest bot rebalance check')
    const account = await near.account(config.warchestAccountId)
    Promise.all([
      reqNextSeatPrice(near),
      reqPoolGetTotalStakedBalance(account, config.poolAccountId),
      reqPoolGetAccountStakedBalance(account, config.warchestAccountId, config.poolAccountId),
      reqPoolGetAccountUnstakedBalance(account, config.warchestAccountId, config.poolAccountId)
    ])
    .then(([seatPrice, poolStake, warchestAccountStakedBalance, warchestAccountUnstakedBalance]) => {
      logger.log('info', `seatPrice ${c2h(seatPrice)}, poolStake ${c2h(poolStake)}, ratio ${c2h(poolStake)/c2h(seatPrice)}`);
      this.prometheusExporter.feed({
        poolTotalStakedBalance: poolStake,
        poolWarchestStakedBalance: warchestAccountStakedBalance,
        poolWarchestUnstakedBalance: warchestAccountUnstakedBalance,
        nextSeatPrice: seatPrice,
        lowThresholdSeatPrice: seatPrice.muln(config.rebalanceLevels.lowThreshold),
        highThresholdSeatPrice: seatPrice.muln(config.rebalanceLevels.highThreshold),
      })
      const proposedAction = generateProposedAction(config.rebalanceLevels, seatPrice, poolStake);
      if (!proposedAction) {
        logger.log('info', 'Current pool stake is conform to requirements. No action proposed.');
        return;
      }
      logger.log('info', `Proposed action : ${actionToString(proposedAction)}`);
      logger.log('info', `Currently staked from Warchest ${c2h(warchestAccountStakedBalance)}, currently unstaked from Warchest ${c2h(warchestAccountUnstakedBalance)}`)
      const actionToExecute = generateActionToExecute(config.rebalancePolicy, proposedAction, warchestAccountStakedBalance, warchestAccountUnstakedBalance);
      if (!actionToExecute) {
        logger.log('warn', `Won't execute proposed action : ${actionToString(proposedAction)}`) 
        return;
      }
      logger.log('info', `Executing action ${actionToString(actionToExecute)}`);
      executeStakeUnstakeAction(account, actionToExecute, config.poolAccountId)
      .then(() => {
        logger.log('info', 'Action executed. Checking new stakes.');
        reqPoolGetTotalStakedBalance(account, config.poolAccountId)
        .then(newPoolStake => {
          logger.log('info', `seatPrice ${c2h(seatPrice)}, poolStake ${c2h(poolStake)}, ratio ${c2h(newPoolStake)/c2h(seatPrice)}`);
        });
      })
      .catch((err) => {
        logger.log('error', 'Error while executing action', err);
      });
    })
  
  }
  

}