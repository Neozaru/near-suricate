import { Telegraf } from 'telegraf';

import ISuricateAlertsReport from "./ISuricateAlertsReport";
import ISuricateAlertEmitter from "./ISuricateAlertEmitter";
import { alertsReportToText } from './alerts';

export default class TelegramEmitter implements ISuricateAlertEmitter {

  private telegramBot;

  constructor(private telegramBotConfig: any) {
    this.telegramBot = new Telegraf(telegramBotConfig.token)
    this.telegramBot.launch();
  }

  public async emit(alertsReport: ISuricateAlertsReport): Promise<any> {
    const alertsReportText = alertsReportToText(alertsReport);
    this.telegramBot.telegram.sendMessage(this.telegramBotConfig.channelId, alertsReportText);
  }

}