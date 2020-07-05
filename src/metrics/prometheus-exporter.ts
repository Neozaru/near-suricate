import BN from 'bn.js';
import http from 'http';
import { c2h } from '../utils';
import { StakingData } from '../near-utils';

interface SuricateMetrics extends StakingData {
  lowThresholdSeatPrice: BN,
  highThresholdSeatPrice: BN,
  alertsCount: number,
}

const metricsPrefix = 'suricate_';

export default class PrometheusExporter {

  private metrics: SuricateMetrics | undefined;

  constructor(private metricsConfig) {}

  private generateMetric(key, value, type): string {
    return `
# HELP ${key} ${key}
# TYPE ${key} ${type}
${key} ${value}
`;
  }

  private generateNearAmountMetric(key: string, value: BN): string {
    return this.generateMetric(metricsPrefix + key, c2h(value), 'gauge');
  }

  private generateGaugeMetric(key: string, value: number) {
    return this.generateMetric(metricsPrefix + key, value, 'gauge');
  }

  private generateMetricsString(metrics: SuricateMetrics) {
    return this.generateNearAmountMetric('pool_total_staked_balance', metrics.poolTotalStake)
    + this.generateNearAmountMetric('pool_delegator_staked_balance', metrics.poolDelegatorStakedBalance)
    + this.generateNearAmountMetric('pool_delegator_unstaked_balance', metrics.poolDelegatorUnstakedBalance)
    + this.generateNearAmountMetric('seat_price_current', metrics.seatPrices.current)
    + this.generateNearAmountMetric('seat_price_next', metrics.seatPrices.next)
    + this.generateNearAmountMetric('seat_price_low_threshold', metrics.lowThresholdSeatPrice)
    + this.generateNearAmountMetric('seat_price_high_threshold', metrics.highThresholdSeatPrice)
    + this.generateGaugeMetric('alerts_count', metrics.alertsCount)
  }

  public feed(metrics: SuricateMetrics) {
    this.metrics = metrics;
  }

  public serve() {
    const {hostname, port} = this.metricsConfig;
    http.createServer((req, res) => {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      if (req.url === '/metrics' && this.metrics) {
        const metricsString = this.generateMetricsString(this.metrics);
        res.end(metricsString);
      } else {
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end();
      }
    }).listen(port, hostname);
  }

}