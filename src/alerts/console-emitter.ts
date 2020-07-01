import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import ISuricateAlert from "./ISuricateAlert";

export default class ConsoleEmitter implements ISuricateAlertEmitter {
  public emit(suricateAlerts: ISuricateAlert[]): any {
    suricateAlerts.forEach(alert => {
      console.log(`[ALERT] ${alert.message}`)
    });
  }
}