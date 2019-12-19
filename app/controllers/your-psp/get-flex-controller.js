'use strict'

// Local dependencies
const { response } = require('../../utils/response')

module.exports = (req, res) => {
  const { change } = req.query || {}
  const isFlexConfigured = req.account.worldpay_3ds_flex &&
    req.account.worldpay_3ds_flex.organisational_unit_id !== undefined &&
    req.account.worldpay_3ds_flex.organisational_unit_id.length > 0
  return response(req, res, 'your-psp/flex', { change, isFlexConfigured })
}
