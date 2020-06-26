
import WarchestBot from './warchest-bot';
import * as nearApi from 'near-api-js';
import moment from 'moment';
import fs from 'fs';


async function main(arg1) {

  const configData = fs.readFileSync('./warchest-bot.config.json').toString();
  const warchestBotConfig = JSON.parse(configData);

  // TODO: Dynamic config
  const nearConnectionConfig = {
    nodeUrl: 'https://rpc.betanet.near.org',
    networkId: 'betanet',
    deps: {
      keyStore: new nearApi.keyStores.UnencryptedFileSystemKeyStore(warchestBotConfig.nearKeystoreDir || undefined)
    }
  };
  console.log('config', warchestBotConfig)


  const near = await nearApi.connect(nearConnectionConfig);
  const warchestBot = new WarchestBot(near, warchestBotConfig);
  console.log(moment().format() + ' - Rebalancing');
  warchestBot.rebalance();
  if (arg1 && arg1 === '--watch') {
    setInterval(() => {
      console.log(moment().format() + ' - Rebalancing (watch)');
      warchestBot.rebalance();
    }, warchestBotConfig.watchInterval * 1000)

  }
}
const [nodeproc, procname, arg1] = process.argv

main(arg1);
