import nodemailer from 'nodemailer';

import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import ISuricateAlert from "./ISuricateAlert";

export default class MailEmitter implements ISuricateAlertEmitter {
  
  private mailTransporter;

  constructor(private mailConfig) {
    this.mailTransporter = nodemailer.createTransport(mailConfig.smtp);
  }

  public async emit(alerts: ISuricateAlert[]): Promise<any> {

    let info = await this.mailTransporter.sendMail({
      from: this.mailConfig.sender,
      to: this.mailConfig.recipients.join(', '),
      subject: `[Suricate] Alerts : ${alerts.map(a => a.type).join(', ')}`, // Subject line
      text: alerts.map(a => a.message).join('\n'), // plain text body
      html: alerts.map(a => a.message).join('<br>'), // html body
    });  
    return info;
  }

}