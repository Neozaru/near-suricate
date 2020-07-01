import SuricateAlert from "./ISuricateAlert";
import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import MailEmitter from "./mail-emitter";
import { statusAlerts } from "./alerts";
import ConsoleEmitter from "./console-emitter";
import { createLoggerWithLabel } from "../logger-factory";

const emittersFactory = {
  'mail': config => new MailEmitter(config),
  'console': config => new ConsoleEmitter(),
}

export default class AlertsManager {

  logger = createLoggerWithLabel('Alerts');

  private emitters: ISuricateAlertEmitter[] = [];

  constructor(private near, private alertsConfig) {
    this.emitters = alertsConfig.emitters.map(emitterKey => emittersFactory[emitterKey](alertsConfig[emitterKey]));
  }

  private emitAlerts(alerts: SuricateAlert[]) {
    return Promise.all(
      this.emitters.map(emitter => emitter.emit(alerts))
    );
  }

  private async scanAlerts() {
    const {near, alertsConfig} = this;

    const status = await near.connection.provider.status();
    const alerts = statusAlerts(status, alertsConfig.validatorAccountId);
    return alerts;
  }

  private async scanAndEmitAlerts() {
    const {logger} = this;

    logger.log('info', `Scanning for alerts...`);
    const alerts = await this.scanAlerts();
    // TODO filter alerts
    if (alerts.length === 0) {
      logger.log('info', `No new alerts.`);
      return Promise.resolve();
    }
    logger.log('info', `${alerts.length} alerts found. Emitting in [${this.alertsConfig.emitters.join(', ')}]`)
    this.emitAlerts(alerts);
  }

  public enable() {
    const {alertsConfig, logger} = this;
    logger.log('info', `Enabling alerts...`);
    this.scanAndEmitAlerts();
    setInterval(() => this.scanAndEmitAlerts(), alertsConfig.interval * 1000)
  }

}