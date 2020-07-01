import ISuricateAlert from "./ISuricateAlert";

export default interface ISuricateAlertEmitter {
  emit: (alerts: ISuricateAlert[]) => Promise<any>
}