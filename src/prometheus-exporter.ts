import http from 'http';
import { c2h } from './utils';

type WarchestMetrics = {
  poolTotalStakedBalance,
  poolWarchestStakedBalance,
  poolWarchestUnstakedBalance,
  nextSeatPrice,
  lowThresholdSeatPrice,
  highThresholdSeatPrice,
}

export default class PrometheusExporter {

  private metrics: WarchestMetrics | undefined;

  constructor(private config) {}

  private generateMetricsString(metrics: WarchestMetrics) {
    return `near_warchest_pool_total_staked_balance ${c2h(metrics.poolTotalStakedBalance)}
near_warchest_pool_warchest_staked_balance ${c2h(metrics.poolWarchestStakedBalance)}
near_warchest_pool_warchest_unstaked_balance ${c2h(metrics.poolWarchestUnstakedBalance)}
near_warchest_seat_price_next ${c2h(metrics.nextSeatPrice)}
near_warchest_seat_price_low_threshold ${c2h(metrics.lowThresholdSeatPrice)}
near_warchest_seat_price_high_threshold ${c2h(metrics.highThresholdSeatPrice)}`
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
    }).listen(this.config.prometheusMetricsPort || 3039);
  }

}