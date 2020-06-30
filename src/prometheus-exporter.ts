import http from 'http';
import { c2h } from './utils';
import { StakingData } from './near-utils';

interface SuricateMetrics extends StakingData {
  lowThresholdSeatPrice,
  highThresholdSeatPrice,
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

  private generateNearAmountMetric(key: string, value): string {
    return this.generateMetric(metricsPrefix + key, c2h(value), 'gauge');
  }

  private generateMetricsString(metrics: SuricateMetrics) {
    return this.generateNearAmountMetric('pool_total_staked_balance', metrics.poolTotalStake)
    + this.generateNearAmountMetric('pool_warchest_staked_balance', metrics.poolWarchestStakedBalance)
    + this.generateNearAmountMetric('pool_warchest_unstaked_balance', metrics.poolWarchestUnstakedBalance)
    + this.generateNearAmountMetric('seat_price_next', metrics.nextSeatPrice)
    + this.generateNearAmountMetric('seat_price_low_threshold', metrics.lowThresholdSeatPrice)
    + this.generateNearAmountMetric('seat_price_high_threshold', metrics.highThresholdSeatPrice)
  }

  public feed(metrics: SuricateMetrics) {
    this.metrics = metrics;
  }

  public serve(hostname: string, port: number) {
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