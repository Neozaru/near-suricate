
import {extractFeatureConfig, isFeatureEnabled} from './utils';
import RebalancingManager from './rebalancing/rebalancing-manager';
import AlertsManager from './alerts/alerts-manager';
import MetricsManager from './metrics/metrics-manager';
import { createLoggerWithLabel } from './logger-factory';

export default class FlowRunner {

  logger = createLoggerWithLabel('Runner');

  constructor(private near, private config) {
  }

  private isBalancingEnabled(): boolean {
    return isFeatureEnabled(this.config, 'rebalancing');
  }

  private isAlertsEnabled(): boolean {
    return isFeatureEnabled(this.config, 'alerts');
  }

  private isMetricsEnabled(): boolean {
    return isFeatureEnabled(this.config, 'metrics');
  }

  private async runFlow(account, rebalancingManager, alertsManager, metricsManager) {
    let rebalancingResult;
    if (this.isBalancingEnabled()) {
      rebalancingResult = await rebalancingManager.checkAndRebalanceStakeForAccount(account)
    }
    let alertsResult;
    if (this.isAlertsEnabled()) {
      alertsResult = await alertsManager.scanAndEmitAlerts({rebalancingResult});
    }
    if (this.isMetricsEnabled()) {
      await metricsManager.refreshMetrics(account, {alertsResult});
    }
  }

  public async startFlowLoop() {
    const {near, config, logger} = this;

    const rebalancingConfig = extractFeatureConfig(config, 'rebalancing');
    const rebalancingManager = new RebalancingManager(near, rebalancingConfig);
    const alertsConfig = extractFeatureConfig(config, 'alerts');
    const alertsManager = new AlertsManager(near, alertsConfig);
    const metricsManager = new MetricsManager(near, config);
  
    if (this.isMetricsEnabled()) {
      // Server
      logger.info('Starting metrics server')
      metricsManager.enable();
    }

    const account = await near.account(config.delegatorAccountId);

    this.runFlow(account, rebalancingManager, alertsManager, metricsManager);
    setInterval(() => {
      this.runFlow(account, rebalancingManager, alertsManager, metricsManager)
    }, config.interval * 1000)
  
  }
}