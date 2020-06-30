import http from 'http';
import { c2h } from './utils';
import { StakingData } from './near-utils';

interface WarchestMetrics extends StakingData {
  // poolTotalStakedBalance,
  // poolWarchestStakedBalance,
  // poolWarchestUnstakedBalance,
  // nextSeatPrice,
  lowThresholdSeatPrice,
  highThresholdSeatPrice,
}

export default class PrometheusExporter {

  private metrics: WarchestMetrics | undefined;

  constructor(private metricsConfig) {}

  private generateMetric(key, value, type): string {
    return `
# HELP ${key} ${key}
# TYPE ${key} ${type}
${key} ${value}
`;
  }

  private generateNearAmountMetric(key: string, value): string {
    return this.generateMetric(key, c2h(value), 'gauge');
  }

  private generateMetricsString(metrics: WarchestMetrics) {
    return this.generateNearAmountMetric('near_warchest_pool_total_staked_balance', metrics.poolTotalStake)
    + this.generateNearAmountMetric('near_warchest_pool_warchest_staked_balance', metrics.poolWarchestStakedBalance)
    + this.generateNearAmountMetric('near_warchest_pool_warchest_unstaked_balance', metrics.poolWarchestUnstakedBalance)
    + this.generateNearAmountMetric('near_warchest_seat_price_next', metrics.nextSeatPrice)
    + this.generateNearAmountMetric('near_warchest_seat_price_low_threshold', metrics.lowThresholdSeatPrice)
    + this.generateNearAmountMetric('near_warchest_seat_price_high_threshold', metrics.highThresholdSeatPrice)
  }

  public feed(metrics: WarchestMetrics) {
    this.metrics = metrics;
  }

  public serve() {
    http.createServer((req, res) => {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      if (req.url === '/metrics' && this.metrics) {
        const metricsString = this.generateMetricsString(this.metrics);
        res.end(metricsString);
      } else {
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end();
      }
    }).listen(this.metricsConfig.port || 3039, this.metricsConfig.hostname || undefined);
  }

}