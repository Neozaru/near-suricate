import nodemailer from 'nodemailer';
import _ from 'lodash';

import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import ISuricateAlert from "./ISuricateAlert";
import ISuricateAlertsReport from './ISuricateAlertsReport';

import {alertsReportToText, alertsReportToHTML} from './alerts';


export default class MailEmitter implements ISuricateAlertEmitter {
  
  private mailTransporter;

  constructor(private mailConfig) {
    this.mailTransporter = nodemailer.createTransport(mailConfig.smtp);
  }

  public async emit(alertsReport: ISuricateAlertsReport): Promise<any> {

    const {addedAlerts, removedAlerts} = alertsReport;

    const intEpochId = Math.floor(alertsReport.context.epochId);

    const subjectAddedAlertsPart = addedAlerts.length > 0 ? `${alertsReport.addedAlerts.length} added alerts` : null;
    const subjectRemovedAlertsPart = removedAlerts.length > 0 ? `${alertsReport.removedAlerts.length} removed alerts` : null;

    const alertsReportText = alertsReportToText(alertsReport);
    const alertsReportHTML = alertsReportToHTML(alertsReport);

    let info = await this.mailTransporter.sendMail({
      from: this.mailConfig.sender,
      to: this.mailConfig.recipients.join(', '),
      subject: `[Suricate] [Epoch ${intEpochId}] ${_.compact([subjectAddedAlertsPart, subjectRemovedAlertsPart]).join(', ')}`,
      text: alertsReportText,
      html: alertsReportHTML,
    });  
    return info;
  }

}