#!/usr/bin/env node

import Suricate from './suricate';
import * as nearApi from 'near-api-js';
import fs from 'fs';
import os from 'os';

import yargs from 'yargs';

import {
  generateConnectionConfig,
} from './near-utils';

const APP_NAME = 'near-suricate'
const MONITOR_COMMAND = 'monitor';

function loadConfigFile(configPath: string) {
  const configData = fs.readFileSync(configPath).toString();
  return JSON.parse(configData);
}

function parseArgv() {
  return yargs
  .scriptName(APP_NAME)
  .usage('Usage: $0 <command> [options]')
  .example(`$0 ${MONITOR_COMMAND} -c config.json -i 3600`, `Fetches data and rebalances stake every hour, getting config from file`)
  .example('$0 --delegatorAccountId neozaru14.betanet --poolAccountId neozaru.stakehouse.net', 'Fetches data and rebalances stake once, getting config from command arguments')
  .config('config', (configPath) => {
    return loadConfigFile(configPath);
  })
  .alias('c', 'config')
  .command(MONITOR_COMMAND, 'Keeps fetching data and rebalancing every <interval>', {
    interval: {
      alias: 'i',
      type: 'number',
      default: 300,
    }
  })
  .default('near.networkId', 'betanet')
  .default('near.nodeUrl', 'https://rpc.betanet.near.org')
  .default('near.keystoreDir', os.homedir() + '/.near-credentials')
  .default('rebalancing.levels.lowThreshold', 1.1)
  .default('rebalancing.levels.lowTarget', 1.2)
  .default('rebalancing.levels.highTarget', 1.8)
  .default('rebalancing.levels.highThreshold', 1.9)
  .default('rebalancing.policy.type', 'BEST')
  .default('rebalancing.policy.minRebalanceAmount', 1000)
  .default('metrics.enabled', true)
  .default('metrics.hostname', '0.0.0.0')
  .default('metrics.port', 3039)
  .demandOption('poolAccountId')
  .demandOption('delegatorAccountId')
  .help('h')
  .alias('h', 'help')
  .argv
}


async function buildSuricate(config) {
  const nearConnectionConfig = generateConnectionConfig(config.near);
  const near = await nearApi.connect(nearConnectionConfig);
  return new Suricate(near, config);
}

async function main() {

  const argv = parseArgv();

  const suricate = await buildSuricate(argv);

  if (argv._.includes(MONITOR_COMMAND)) {
    suricate.startMonitoring(<number>argv.interval * 1000);
  } else {
    suricate.checkAndRebalanceStakeOnce();
  }
}

main();
