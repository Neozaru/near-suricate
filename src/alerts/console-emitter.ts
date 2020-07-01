import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import ISuricateAlert from "./ISuricateAlert";
import { createLoggerWithLabel } from "../logger-factory";

export default class ConsoleEmitter implements ISuricateAlertEmitter {

  logger = createLoggerWithLabel('[ALERT:console]')

  public emit(suricateAlerts: ISuricateAlert[]): any {
    const {logger} = this;
    suricateAlerts.forEach(alert => {
      logger.log('warn', `[ALERT] ${alert.message}`)
    });
  }
}