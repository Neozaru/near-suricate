import PrometheusExporter from "./prometheus-exporter";
import { reqValidatorsInfo, fetchStakingData, reqSeatPrices } from "../near-utils";
import { computeEpochInfo, computeValidatorInfo } from "../utils";
import { createLoggerWithLabel } from "../logger-factory";
import ISuricateAlertsReport from "../alerts/ISuricateAlertsReport";

export default class MetricsManager {

  private prometheusExporter;
  logger = createLoggerWithLabel('Metrics');

  // TODO: Metrics manager takes global config ?
  constructor(private near, private config) {
    this.prometheusExporter = new PrometheusExporter(config.metrics);
  }

  public async refreshMetrics(account, rebalancingReport?, alertsReport?: ISuricateAlertsReport) {
    const {near, config, logger} = this;
    const stakingData = await fetchStakingData(account, config.poolAccountId, config.delegatorAccountId);
    const seatPrices = await reqSeatPrices(account);
    const status = await near.connection.provider.status();
    const latestBlockHeight = status.sync_info.latest_block_height 
    const valInfo = await reqValidatorsInfo(near, latestBlockHeight);

    const epochInfo = computeEpochInfo(valInfo, latestBlockHeight);
    const validatorInfo = computeValidatorInfo(valInfo, config.poolAccountId);

    // TODO: Organize all that 
    const metricsData = {
      latestBlockHeight,
      epochInfo,
      stakingData,
      validatorInfo,
      seatPrices: {
        ...seatPrices,
        lowThresholdNextSeatPrice: seatPrices.next.muln(config.rebalancing.levels.lowThreshold),
        highThresholdNextSeatPrice: seatPrices.next.muln(config.rebalancing.levels.highThreshold),
      },
      alertsCount: alertsReport ? alertsReport.alerts.length : 0
    }

    logger.log('info', `Updating metrics...`);
    this.prometheusExporter && this.prometheusExporter.feed(metricsData);
    logger.log('info', `Metrics updated.`);
  }

  public async enable() {
    this.prometheusExporter.serve();
  }

}