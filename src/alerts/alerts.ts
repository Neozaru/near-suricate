import SuricateAlert from './ISuricateAlert';

// TODO: Make it somewhat configurable
const BLOCKS_PRODUCED_EXPECTED_ALERT_RATIO = 0.95;
const BLOCKS_PRODUCED_EXPECTED_SLASHING_RATIO = 0.90;

function createAlertProtocolVersion(nodeProtocolVersion: number, latestProtocolVersion: number): SuricateAlert {
  return {
    type: 'PROTOCOL_VERSION',
    message: `Node protocol version (${nodeProtocolVersion}) is different from latest protocol version (${latestProtocolVersion}). An upgrade might be required.`,
    values: {
      nodeProtocolVersion,
      latestProtocolVersion,
    }
  }
}

function createAlertValidatorExpectedProducedBlocks(poolAccountId: string, producedExpectedRatio: number, producedBlocks: number, expectedBlocks: number): SuricateAlert {
  return {
    type: 'VALIDATOR_EXPECTED_PRODUCED_BLOCKS',
    message: `Account ${poolAccountId} has produced less blocks (${producedBlocks}) than expected (${expectedBlocks}). Online status is only ${Math.round(producedExpectedRatio*10000)/100}%, close to the slashing threshold (${BLOCKS_PRODUCED_EXPECTED_SLASHING_RATIO*100}%)`,
    values: {
      poolAccountId,
      producedBlocks,
      expectedBlocks,
    }
  }
}

function createAlertNotValidator(poolAccountId: string, validators: any[]): SuricateAlert {
  return {
    type: 'NOT_VALIDATOR',
    message: `Account ${poolAccountId} not found in validator's list.`,
    values: {
      poolAccountId,
      validators,
    }
  }
}

function createAlertValidatorSlashed(poolAccountId: string): SuricateAlert {
  return {
    type: 'VALIDATOR_SLASHED',
    message: `Account ${poolAccountId} is slashed. It won't be able to continue validating.`,
    values: {
      poolAccountId,
    }
  }
}

// TODO: Type validators
function validatorsAlerts(validators: any, poolAccountId: string): SuricateAlert[] {
  let alerts: SuricateAlert[] = [];

  const userValidator = validators.current_validators.find(v => v.account_id === poolAccountId);
  if (!userValidator) {
    alerts.push(createAlertNotValidator(poolAccountId, validators.current_validators));
  } else {
    if (userValidator.is_slashed === true) {
      alerts.push(createAlertValidatorSlashed(poolAccountId))
    } 
    const blocksProducedExpectedRatio = userValidator.num_produced_blocks / userValidator.num_expected_blocks
    if (blocksProducedExpectedRatio < BLOCKS_PRODUCED_EXPECTED_ALERT_RATIO) {
      alerts.push(createAlertValidatorExpectedProducedBlocks(poolAccountId, blocksProducedExpectedRatio, userValidator.num_produced_blocks, userValidator.num_expected_blocks));
    }
  }
  return alerts;
}


// TODO: Type status
function statusAlerts(status: any): SuricateAlert[] {
  let alerts: SuricateAlert[] = [];
  if (status.protocol_version != status.latest_protocol_version) {
    alerts.push(createAlertProtocolVersion(status.protocol_version, status.latest_protocol_version));
  }
  return alerts;
}


export {
  statusAlerts,
  validatorsAlerts,
}