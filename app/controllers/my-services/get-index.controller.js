'use strict'

const lodash = require('lodash')

const { response } = require('../../utils/response')
const serviceService = require('../../services/service.service')
const { filterGatewayAccountIds } = require('../../utils/permissions')
const getHeldPermissions = require('../../utils/get-held-permissions')

function hasStripeAccount (gatewayAccounts) {
  return gatewayAccounts.some(gatewayAccount =>
    gatewayAccount.payment_provider === 'stripe')
}

function sortServicesByLiveThenName (a, b) {
  const aHasLive = a.gatewayAccounts.some(account => account.type === 'live')
  const bHasLive = b.gatewayAccounts.some(account => account.type === 'live')
  const aName = a.name.toLowerCase()
  const bName = b.name.toLowerCase()

  // live comes before test, then sort by name ascending
  if (aHasLive && !bHasLive) { return -1 }
  if (!aHasLive && bHasLive) { return 1 }
  if (aName < bName) { return -1 }
  if (aName > bName) { return 1 }
  return 0
}

module.exports = async function getServiceList (req, res) {
  const servicesRoles = lodash.get(req, 'user.serviceRoles', [])
  const newServiceId = req.query && req.query.s

  const aggregatedGatewayAccountIds = servicesRoles
    .flatMap(servicesRole => servicesRole.service.gatewayAccountIds)

  const aggregatedGatewayAccounts = await serviceService.getGatewayAccounts(aggregatedGatewayAccountIds, req.correlationId)
  const servicesData = servicesRoles
    .map(serviceRole => {
      const gatewayAccounts = aggregatedGatewayAccounts.filter(gatewayAccount =>
        serviceRole.service.gatewayAccountIds.includes(gatewayAccount.id.toString()))
      const serviceData = {
        name: serviceRole.service.name === 'System Generated' ? 'Temporary Service Name' : serviceRole.service.name,
        id: serviceRole.service.id,
        external_id: serviceRole.service.externalId,
        gatewayAccounts: lodash.sortBy(gatewayAccounts, 'type', 'asc'),
        permissions: getHeldPermissions(serviceRole.role.permissions.map(permission => permission.name)),
        experimental_features_enabled: serviceRole.service.experimentalFeaturesEnabled
      }
      return serviceData
    })
    .sort((a, b) => sortServicesByLiveThenName(a, b))

  const data = {
    services: servicesData,
    services_singular: servicesData.length === 1,
    env: process.env,
    has_account_with_payouts: hasStripeAccount(aggregatedGatewayAccounts),
    has_live_account: filterGatewayAccountIds(aggregatedGatewayAccounts, true).length
  }
  if (newServiceId) {
    servicesData.find(service => {
      if (service.external_id === newServiceId) {
        data.new_service_name = service.name
        return true
      }
    })
  }

  return response(req, res, 'services/index', data)
}
