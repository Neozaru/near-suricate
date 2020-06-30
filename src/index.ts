
import Suricate from './suricate';
import * as nearApi from 'near-api-js';
import fs from 'fs';

import yargs from 'yargs';

import {
  generateConnectionConfig,
} from './near-utils';

const MONITOR_COMMAND = 'monitor';

function loadConfig(filename: string) {
  const configData = fs.readFileSync(filename).toString();
  return JSON.parse(configData);
}

function parseArgv() {
  return yargs
  .usage('Usage: $0 <command> [options]')
  .example(`$0 ${MONITOR_COMMAND} -i 3600`, `Fetches data and rebalances stake every hour`)
  .example('$0 -c custom-config.json', 'Fetches data and rebalances stake once using a different config file')
  .command(MONITOR_COMMAND, 'Keeps fetching data and rebalancing every <interval>', {
    interval: {
      alias: 'i',
      type: 'number',
      default: 300,
    }
  })
  .alias('c', 'config')
  .nargs('c', 1)
  .describe('c', 'Config file')
  .default('c', 'suricate.config.json')
  .help('h')
  .alias('h', 'help')
  .argv
}

async function buildSuricate(configFilename) {
  const config = loadConfig(configFilename);

  const nearConnectionConfig = generateConnectionConfig(config.near);

  const near = await nearApi.connect(nearConnectionConfig);
  return new Suricate(near, config);
}

async function main() {

  const argv = parseArgv();

  const suricate = await buildSuricate(<string>argv.config);

  if (argv._.includes(MONITOR_COMMAND)) {
    suricate.startMonitoring(<number>argv.interval * 1000);
  } else {
    suricate.checkAndRebalanceStakeOnce();
  }
}

main();
