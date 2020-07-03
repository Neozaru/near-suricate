import ISuricateAlertsReport from "./ISuricateAlertsReport";

export default interface ISuricateAlertEmitter {
  emit: (alertsReport: ISuricateAlertsReport) => Promise<any>
}