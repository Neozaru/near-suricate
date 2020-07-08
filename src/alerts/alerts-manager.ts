import SuricateAlert from "./ISuricateAlert";
import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import ISuricateAlertsReport from "./ISuricateAlertsReport";
import MailEmitter from "./mail-emitter";
import { statusAlerts, validatorsAlerts } from "./alerts";
import ConsoleEmitter from "./console-emitter";
import { createLoggerWithLabel } from "../logger-factory";
import { reqValidatorsInfo } from "../near-utils";
import { computeEpochInfo } from "../utils";

import _ from 'lodash';

const emittersFactory = {
  'mail': config => new MailEmitter(config),
  'console': config => new ConsoleEmitter(),
}

export default class AlertsManager {

  logger = createLoggerWithLabel('Alerts');

  private emitters: ISuricateAlertEmitter[] = [];

  private latestAlertsReport: ISuricateAlertsReport;

  constructor(private near, private alertsConfig) {
    this.emitters = alertsConfig.emitters.map(emitterKey => emittersFactory[emitterKey](alertsConfig[emitterKey]));
    this.latestAlertsReport = this.generateEmptyAlertsReport();
  }

  private generateEmptyAlertsReport() {
    return this.generateFreshAlertsReport([], -1);
  }

  private generateFreshAlertsReport(alerts: SuricateAlert[], epochId: number): ISuricateAlertsReport {
    return {
      alerts,
      addedAlerts: alerts,
      removedAlerts: [],
      context: {
        epochId,
        isFirstReportForEpoch: true
      }
    }
  }

  private generateAlertsReport(alerts: SuricateAlert[], epochId: number): ISuricateAlertsReport {
    const {latestAlertsReport, logger} = this;
    if (Math.floor(epochId) > Math.floor(latestAlertsReport.context.epochId)) {
      logger.info(`New epoch : ${epochId}. Building fresh alerts report.`)
      return this.generateFreshAlertsReport(alerts, epochId);
    }
    return {
      alerts,
      addedAlerts: _.differenceBy(alerts, this.latestAlertsReport.alerts, 'type'),
      removedAlerts: _.differenceBy(this.latestAlertsReport.alerts, alerts, 'type'),
      context: {
        epochId,
        isFirstReportForEpoch: false
      }
    }
  }

  private async scanAlerts() {
    const {near, alertsConfig} = this;

    let alerts: SuricateAlert[] = [];
    const status = await near.connection.provider.status();

    const latestBlockHeight = status.sync_info.latest_block_height 
    alerts = alerts.concat(statusAlerts(status));

    const valInfo = await reqValidatorsInfo(near, latestBlockHeight);
    alerts = alerts.concat(validatorsAlerts(valInfo, alertsConfig.validatorAccountId));

    const epochInfo = computeEpochInfo(valInfo, latestBlockHeight);

    return this.generateAlertsReport(alerts, epochInfo.id);
  }

  private async emitAlertReport(alertsReport: ISuricateAlertsReport) {
    const {alertsConfig, logger} = this;

    // TODO filter alerts by user config
    if (alertsReport.addedAlerts.length === 0 && alertsReport.removedAlerts.length === 0) {
      logger.log('info', `No update on alerts (${alertsReport.alerts.length} current alerts).`);
      return;
    }
    logger.log('info', `${alertsReport.addedAlerts.length} added alerts. ${alertsReport.removedAlerts.length} removed alerts. Emitting in [${alertsConfig.emitters.join(', ')}].`)

    return Promise.all(
      this.emitters.map(emitter => emitter.emit(alertsReport))
    );
  }

  public async scanAndEmitAlerts() {
    const {logger} = this;

    logger.log('info', `Scanning for alerts...`);
    this.latestAlertsReport = await this.scanAlerts();
    this.emitAlertReport(this.latestAlertsReport);
    return this.latestAlertsReport;
  }

}