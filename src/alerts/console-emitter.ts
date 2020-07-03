import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import ISuricateAlert from "./ISuricateAlert";
import { createLoggerWithLabel } from "../logger-factory";
import ISuricateAlertsReport from "./ISuricateAlertsReport";

export default class ConsoleEmitter implements ISuricateAlertEmitter {

  logger = createLoggerWithLabel('ALERT.emitter:console')

  public emit(suricateAlertsReport: ISuricateAlertsReport): any {
    const {logger} = this;
    suricateAlertsReport.addedAlerts.forEach(alert => {
      logger.log('warn', `[ADDED ALERT] ${alert.type} ${alert.message}`)
    });
    suricateAlertsReport.removedAlerts.forEach(alert => {
      logger.log('warn', `[REMOVED ALERT] ${alert.type} is no longer an issue (${alert.message})`)
    });
  }
}