import ISuricateAlert from "./ISuricateAlert";

export default interface ISuricateAlertsReport {
  alerts: ISuricateAlert[],
  addedAlerts: ISuricateAlert[],
  removedAlerts: ISuricateAlert[],
  context: {
    epochId: number,
    isFirstReportForEpoch: boolean,
  }
}