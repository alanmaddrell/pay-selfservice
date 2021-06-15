'use strict'

const { InvalidConfigurationError } = require('../errors')

const CREDENTIAL_STATE = {
  CREATED: 'CREATED',
  ENTERED: 'ENTERED',
  VERIFIED: 'VERIFIED_WITH_LIVE_PAYMENT',
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED'
}

function getCurrentCredential (gatewayAccount = {}) {
  const credentials = gatewayAccount.gateway_account_credentials || []
  return credentials
    .filter((credential) => credential.state === CREDENTIAL_STATE.ACTIVE)[0] || null
}

// gets exactly one switching credential, only given the right account state (one active credential exists)
// throws an error if there's any ambiguity in the target of the switch
function getSwitchingCredential (gatewayAccount = {}) {
  const credentials = gatewayAccount.gateway_account_credentials || []

  // make sure there's an active credential we're switching from
  if (getCurrentCredential(gatewayAccount)) {
    const pendingCredentials = credentials
      .filter((credential) => [ CREDENTIAL_STATE.CREATED, CREDENTIAL_STATE.ENTERED, CREDENTIAL_STATE.VERIFIED ].includes(credential.state))

    if (!pendingCredentials.length || pendingCredentials.length > 1) {
      throw new InvalidConfigurationError('Unable to determine which credentials are being switched to')
    }
    return pendingCredentials[0]
  } else {
    throw new InvalidConfigurationError('No active credential on this account to switch from')
  }
}

module.exports = { getCurrentCredential, getSwitchingCredential }
