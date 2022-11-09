'use strict'

const paths = require('../../paths')
const formatAccountPathsFor = require('../../utils/format-account-paths-for')
const { renderErrorView } = require('../../utils/response')
const { ConnectorClient } = require('../../services/clients/connector.client')
const { getCredentialByExternalId } = require('../../utils/credentials')
const connector = new ConnectorClient(process.env.CONNECTOR_URL)

module.exports = async function toggleWorldpay3dsFlex (req, res, next) {
  const accountId = req.account.gateway_account_id
  const toggleWorldpay3dsFlex = req.body['toggle-worldpay-3ds-flex']

  if (req.body['toggle-worldpay-3ds-flex'] === 'on' || req.body['toggle-worldpay-3ds-flex'] === 'off') {
    const enabling3dsFlex = toggleWorldpay3dsFlex === 'on'
    const message = enabling3dsFlex ? '3DS Flex has been turned on.' : '3DS Flex has been turned off. Your payments will now use 3DS only.'
    const integrationVersion3ds = enabling3dsFlex ? 2 : 1
    try {
      const credential = getCredentialByExternalId(req.account, req.params.credentialId)
      await connector.updateIntegrationVersion3ds(accountId, integrationVersion3ds)
      req.flash('generic', message)
      return res.redirect(303, formatAccountPathsFor(paths.account.yourPsp.index, req.account.external_id, credential.external_id))
    } catch (err) {
      next(err)
    }
  } else {
    return renderErrorView(req, res, false, 400)
  }
}
