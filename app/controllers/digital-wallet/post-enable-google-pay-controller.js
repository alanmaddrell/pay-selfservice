'use strict'

// Local dependencies
const paths = require('../../paths')
const { ConnectorClient } = require('../../services/clients/connector_client')
const auth = require('../../services/auth_service')
const { CORRELATION_HEADER } = require('../../utils/correlation_header.js')
const connector = new ConnectorClient(process.env.CONNECTOR_URL)

const displayErrorMessage = (error) => {
  return Array.isArray(error.message.errors) ? error.message.errors.join(', ') : error.message.message
}

module.exports = (req, res) => {
  const gatewayAccountId = auth.getCurrentGatewayAccountId(req)
  const correlationId = req.headers[CORRELATION_HEADER] || ''
  const gatewayMerchantId = req.body.merchantId
  const enableGooglePayPayload = { 'op': 'replace', 'path': 'allow_google_pay', 'value': 'true' }
  const setGatewayMerchantIdPayload = { 'op': 'add', 'path': 'credentials/gateway_merchant_id', 'value': gatewayMerchantId }

  const enableGooglePayBoolean = connector.patchAccount({
    gatewayAccountId,
    correlationId,
    payload: enableGooglePayPayload
  })

  const setGatewayMerchantId = connector.patchAccount({
    gatewayAccountId,
    correlationId,
    payload: setGatewayMerchantIdPayload
  })

  Promise.all([setGatewayMerchantId, enableGooglePayBoolean]).then(() => {
    req.flash('generic', '<h2>Google Pay successfully enabled.</h2>')
    return res.redirect(paths.digitalWallet.summary)
  }).catch(err => {
    req.flash('genericError', `<h2>Something went wrong</h2><p>${displayErrorMessage(err)}</p>`)
    return res.redirect(paths.digitalWallet.confirmGooglePay)
  })
}
