
// Yocta to Near
function c2h(value): number {
  return value.toString() / Math.pow(10,24)
}

function toPercentTwoDecimals(value) {
  return Math.round(value * 10000) / 100;
}

function computeEpochId(blockHeight: number, epochLength: number, genesisHeight: number) {
  return (blockHeight - genesisHeight) / epochLength;
}

function computeEpochProgress(blockHeight: number, epochLength: number, epochStartHeight: number) {
  return (blockHeight - epochStartHeight) / epochLength;
}

// TODO type validatorInfo
function computeEpochInfo(validatorInfo: any, blockHeight: number) {
  const epochLength = validatorInfo.genesisConfig.epoch_length;
  const epochStartHeight = validatorInfo.epoch_start_height;
  const genesisHeight = validatorInfo.genesisConfig.genesis_height;
  const epochId = computeEpochId(blockHeight, epochLength, genesisHeight);
  return {
    id: Math.floor(epochId),
    idFloat: epochId,
    startHeight: epochStartHeight,
    progress: toPercentTwoDecimals(computeEpochProgress(blockHeight, epochLength, epochStartHeight)),
    blocks: (blockHeight - epochStartHeight)
  }
}

function computeValidatorInfo(validatorInfo: any, validatorAccountId: string) {
  const validator = validatorInfo.current_validators.find(v => v.account_id === validatorAccountId);
  if (validator) {
    return {
      expectedBlocks: validator.num_expected_blocks,
      producedBlocks: validator.num_produced_blocks,
      uptimeRatio: toPercentTwoDecimals(validator.num_produced_blocks / validator.num_expected_blocks)
    }
  }
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

export {
  c2h,
  computeEpochInfo,
  computeValidatorInfo,
  extractFeatureConfig,
  isFeatureEnabled,
}