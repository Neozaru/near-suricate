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

  .default('near.networkId', 'betanet')
  .default('near.nodeUrl', 'https://rpc.betanet.near.org')
  .default('near.keystoreDir', os.homedir() + '/.near-credentials')

  .default('rebalancing.enabled', true)
  .default('rebalancing.interval', 300)
  .default('rebalancing.levels.lowThreshold', 1.1)
  .default('rebalancing.levels.lowTarget', 1.2)
  .default('rebalancing.levels.highTarget', 1.8)
  .default('rebalancing.levels.highThreshold', 1.9)
  .default('rebalancing.policy.type', 'BEST')
  .default('rebalancing.policy.minRebalanceAmount', 1000)

  .default('alerts.enabled', true)
  .default('alerts.interval', 300)
  .default('alerts.emitters', ['console'])

  .default('metrics.enabled', true)
  .default('metrics.interval', 300)
  .default('metrics.hostname', '0.0.0.0')
  .default('metrics.port', 3039)

  .help('h')
  .alias('h', 'help')
  .argv
}

function extractFeatureConfig(config: any, featureName: string) {
  const {delegatorAccountId, validatorAccountId} = config;
  return {
    delegatorAccountId,
    validatorAccountId,
    ...config[featureName]
  }
}

function isFeatureEnabled(config: any, featureName: string) {
  const featureEnabledValue = config[featureName].enabled;
  return featureEnabledValue === true || featureEnabledValue === 'true';
}

async function main() {
  const config: any = parseArgv();

  console.log(`Initializing with delegatorAccount ${config.delegatorAccountId} and validatorAccount ${config.validatorAccountId} (keystore: ${config.near.keystoreDir})`)

  const nearConnectionConfig = generateConnectionConfig(config.near);
  const near = await nearApi.connect(nearConnectionConfig);

  if (isFeatureEnabled(config, 'rebalancing')) {
    const rebalancingConfig = extractFeatureConfig(config, 'rebalancing');
    const rebalancingManager = new RebalancingManager(near, rebalancingConfig);
    rebalancingManager.enable();
  }
  if (isFeatureEnabled(config, 'alerts')) {
    const alertsConfig = extractFeatureConfig(config, 'alerts');
    const alertsManager = new AlertsManager(near, alertsConfig);
    alertsManager.enable();
  }
  if (isFeatureEnabled(config, 'metrics')) {
    const metricsManager = new MetricsManager(near, config);
    metricsManager.enable();
  }
}

main();
