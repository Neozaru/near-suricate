import SuricateAlert from "./ISuricateAlert";
import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import MailEmitter from "./mail-emitter";
import { statusAlerts } from "./alerts";
import ConsoleEmitter from "./console-emitter";

const emittersFactory = {
  'mail': config => new MailEmitter(config),
  'console': config => new ConsoleEmitter(),
}

export default class AlertsManager {

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
    const {near} = this;

    console.log('Scanning for alerts')
    const status = await near.connection.provider.status();
    const alerts = statusAlerts(status, 'neozaru.stakehouse.betane');
    return alerts;
  }

  private async scanAndEmitAlerts() {
    const alerts = await this.scanAlerts();
    // TODO filter alerts
    if (alerts.length === 0) {
      console.log(`No alerts - won't send any`);
      return Promise.resolve();
    }
    console.log(`${alerts.length} alerts found. Emitting in [${this.alertsConfig.emitters.join(', ')}]`)
    this.emitAlerts(alerts);
  }

  public enable() {
    setInterval(() => this.scanAndEmitAlerts(), this.alertsConfig.interval * 1000)
  }

}