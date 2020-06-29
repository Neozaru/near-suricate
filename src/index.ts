
import WarchestBot from './warchest-bot';
import * as nearApi from 'near-api-js';
import fs from 'fs';

import yargs from 'yargs';

function loadConfig(filename: string) {
  const configData = fs.readFileSync(filename).toString();
  return JSON.parse(configData);
}

function parseArgv() {
  return yargs
  .usage('Usage: $0 <command> [options]')
  .example('$0 watch -i 3600', 'Checks and rebalances stake every hour')
  .example('$0 -c custom-config.json', 'Checks and rebalances stake once with a custom config')
  .command('watch', 'Keeps checking and rebalancing every <interval>', {
    interval: {
      alias: 'i',
      type: 'number',
      default: 300,
    }
  })
  .alias('c', 'config')
  .nargs('c', 1)
  .describe('c', 'Path of config file')
  .default('c', 'warchest-bot.config.json')
  .help('h')
  .alias('h', 'help')
  .argv
}

async function buildWarchestBot(configFilename) {
  const config = loadConfig(configFilename);

  const nearConnectionConfig = {
    nodeUrl: config.nodeUrl || 'https://rpc.betanet.near.org',
    networkId: config.networkId || 'betanet',
    deps: {
      keyStore: new nearApi.keyStores.UnencryptedFileSystemKeyStore(config.nearKeystoreDir || undefined)
    }
  };

  const near = await nearApi.connect(nearConnectionConfig);
  return new WarchestBot(near, config);
}

async function main() {

  const argv = parseArgv();

  const warchestBot = await buildWarchestBot(<string>argv.config);
  warchestBot.rebalance();
  if (argv._.includes('watch')) {
    setInterval(() => {
      warchestBot.rebalance();
    }, <number>argv.interval * 1000)

  }
}

main();
