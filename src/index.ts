#!/usr/bin/env node

import * as nearApi from 'near-api-js';
import fs from 'fs';
import os from 'os';

import yargs from 'yargs';

import {
  generateConnectionConfig,
} from './near-utils';

import AlertsManager from './alerts/alerts-manager';
import RebalancingManager from './rebalancing/rebalancing-manager';
import MetricsManager from './metrics/metrics-manager';
import FlowRunner from './flow-runner';

const APP_NAME = 'near-suricate'

function loadConfigFile(configPath: string) {
  const configData = fs.readFileSync(configPath).toString();
  return JSON.parse(configData);
}

function parseArgv() {
  return yargs
  .scriptName(APP_NAME)
  .usage('Usage: $0 [options]')
  .example(`$0 --config config.json`, `Run using given config file - at least <delegatorAccountId> and <poolAccountId> fields must exist in config.json`)
  .example('$0 --delegatorAccountId neozaru14.betanet --poolAccountId neozaru.stakehouse.net', 'Run using default configuration and account arguments.')
  .config('config', (configPath) => {
    return loadConfigFile(configPath);
  })
  .alias('c', 'config')

  .alias('poolAccountId', 'validatorAccountId')
  .demandOption(['validatorAccountId', 'delegatorAccountId'])

  .default('interval', 300)

  .default('near.networkId', 'betanet')
  .default('near.nodeUrl', 'https://rpc.betanet.near.org')
  .default('near.keystoreDir', os.homedir() + '/.near-credentials')

  .default('rebalancing.enabled', true)
  .default('rebalancing.levels.lowThreshold', 1.2)
  .default('rebalancing.levels.lowTarget', 1.3)
  .default('rebalancing.levels.highTarget', 1.7)
  .default('rebalancing.levels.highThreshold', 1.8)
  .default('rebalancing.policy.type', 'BEST')
  .default('rebalancing.policy.minRebalanceAmount', 1000)

  .default('alerts.enabled', true)
  .default('alerts.emitters', ['console'])

  .default('metrics.enabled', true)
  .default('metrics.hostname', '0.0.0.0')
  .default('metrics.port', 3039)

  .help('h')
  .alias('h', 'help')
  .argv
}

async function main() {
  const config: any = parseArgv();

  console.log(`Initializing with delegatorAccount ${config.delegatorAccountId} and validatorAccount ${config.validatorAccountId} (keystore: ${config.near.keystoreDir})`)

  const nearConnectionConfig = generateConnectionConfig(config.near);
  const near = await nearApi.connect(nearConnectionConfig);

  const flowRunner = new FlowRunner(near, config);
  flowRunner.startFlowLoop();
}

main();
