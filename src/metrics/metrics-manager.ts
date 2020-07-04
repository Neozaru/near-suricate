import PrometheusExporter from "./prometheus-exporter";
import { fetchStakingData } from "../near-utils";
import { createLoggerWithLabel } from "../logger-factory";
import ISuricateAlertsReport from "../alerts/ISuricateAlertsReport";

export default class MetricsManager {

  private prometheusExporter;
  logger = createLoggerWithLabel('Metrics');

  // TODO: Metrics manager takes global config ?
  constructor(private near, private config) {
    this.prometheusExporter = new PrometheusExporter(config.metrics);
  }

  private consolidateMetricsData(stakingData, rebalancingReport?, alertsReport?: ISuricateAlertsReport) {
    const {config} = this;
    return {
      ...stakingData,
      lowThresholdSeatPrice: stakingData.nextSeatPrice.muln(config.rebalancing.levels.lowThreshold),
      highThresholdSeatPrice: stakingData.nextSeatPrice.muln(config.rebalancing.levels.highThreshold),
      alertsCount: alertsReport ? alertsReport.alerts.length : 0
    }
  }

  public async refreshMetrics(account, rebalancingReport?, alertsReport?: ISuricateAlertsReport) {
    const {near, config, logger} = this;
    const stakingData = await fetchStakingData(near, account, config.poolAccountId, config.delegatorAccountId);
    logger.log('info', `Updating metrics...`);
    const metricsData = this.consolidateMetricsData(stakingData, rebalancingReport, alertsReport);
    this.prometheusExporter && this.prometheusExporter.feed(metricsData);
    logger.log('info', `Metrics updated.`);
  }

  public async enable() {
    this.prometheusExporter.serve();
  }

}