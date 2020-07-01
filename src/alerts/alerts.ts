import SuricateAlert from './ISuricateAlert';



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
    message: `Account ${poolAccountId} is slashed.`,
    values: {
      poolAccountId,
    }
  }
} 

// TODO: Type status
function statusAlerts(status: any, poolAccountId: string) {
  let alerts: SuricateAlert[] = [];
  if (status.protocol_version != status.latest_protocol_version) {
    alerts.push(createAlertProtocolVersion(status.protocol_version, status.latest_protocol_version));
  }
  const userValidator = status.validators.find(v => v.account_id === poolAccountId);
  if (!userValidator) {
    alerts.push(createAlertNotValidator(poolAccountId, status.validators));
  } else {
    if (userValidator.is_slashed === true) {
      alerts.push(createAlertValidatorSlashed(poolAccountId))
    }
  }
  return alerts;
}


export {
  statusAlerts
}