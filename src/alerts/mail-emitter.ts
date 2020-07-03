import nodemailer from 'nodemailer';

import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import ISuricateAlert from "./ISuricateAlert";
import ISuricateAlertsReport from './ISuricateAlertsReport';

import _ from 'lodash';

export default class MailEmitter implements ISuricateAlertEmitter {
  
  private mailTransporter;

  constructor(private mailConfig) {
    this.mailTransporter = nodemailer.createTransport(mailConfig.smtp);
  }


  private static alertString(alert): string {
    return `- ${alert.type}: ${alert.message}`
  }

  private static alertsListText(alerts: ISuricateAlert[]) {
    return alerts.map(MailEmitter.alertString).join('\n');
  }

  private static alertsListHTML(alerts: ISuricateAlert[]) {
    return alerts.map(MailEmitter.alertString).join('<br>');
  }

  private static alertsTypesList(alerts: ISuricateAlert[]) {
    return _.map(alerts, 'type').join(', ');
  }

  public async emit(alertsReport: ISuricateAlertsReport): Promise<any> {

    const {alerts, addedAlerts, removedAlerts} = alertsReport;

    const intEpochId = Math.floor(alertsReport.context.epochId);

    const subjectAddedAlertsPart = addedAlerts.length > 0 ? `${alertsReport.addedAlerts.length} added alerts` : null;
    const subjectRemovedAlertsPart = removedAlerts.length > 0 ? `${alertsReport.removedAlerts.length} removed alerts` : null;

    const textBodyAddedAlerts = addedAlerts.length > 0 ? `New alerts detected:\n${MailEmitter.alertsListText(addedAlerts)}` : null;
    const textBodyRemovedAlerts = removedAlerts.length > 0 ? `The following alerts are no longer an issue:\n${MailEmitter.alertsListText(removedAlerts)}`: null;

    const htmlBodyAddedAlerts = addedAlerts.length > 0 ? `New alerts detected:<br>${MailEmitter.alertsListHTML(addedAlerts)}` : null;
    const htmlBodyRemovedAlerts = removedAlerts.length > 0 ? `The following alerts are no longer an issue:<br>${MailEmitter.alertsListHTML(removedAlerts)}`: null;

    const textActiveAlerts = alerts.length > 0 ? `Active alerts :\n${MailEmitter.alertsTypesList(alerts)}` : null;
    const htmlActiveAlerts = alerts.length > 0 ? `Active alerts :<br>${MailEmitter.alertsTypesList(alerts)}` : null;

    let info = await this.mailTransporter.sendMail({
      from: this.mailConfig.sender,
      to: this.mailConfig.recipients.join(', '),
      subject: `[Suricate] [Epoch ${intEpochId}] ${_.compact([subjectAddedAlertsPart, subjectRemovedAlertsPart]).join(', ')}`,
      text: `${_.compact([textBodyAddedAlerts, textBodyRemovedAlerts, textActiveAlerts]).join('\n')}\nEpoch ID: ${alertsReport.context.epochId}`,
      html: `${_.compact([htmlBodyAddedAlerts, htmlBodyRemovedAlerts, htmlActiveAlerts]).join('<br>')}<br>Epoch ID: ${alertsReport.context.epochId}`,
    });  
    return info;
  }

}