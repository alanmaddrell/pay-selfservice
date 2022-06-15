'use strict'

const lodash = require('lodash')

const goLiveStageToNextPagePath = require('../go-live-stage-to-next-page-path')
const goLiveStage = require('../../../models/go-live-stage')
const paths = require('../../../paths')
const {
  validateMandatoryField,
  validateOptionalField,
  validatePostcode,
  validatePhoneNumber,
  validateUrl
} = require('../../../utils/validation/server-side-form-validations')
const { updateService } = require('../../../services/service.service')
const { validPaths, ServiceUpdateRequest } = require('../../../models/ServiceUpdateRequest.class')
const formatServicePathsFor = require('../../../utils/format-service-paths-for')
const { response } = require('../../../utils/response')
const { countries } = require('@govuk-pay/pay-js-commons').utils

const clientFieldNames = {
  name: 'merchant-name',
  addressLine1: 'address-line1',
  addressLine2: 'address-line2',
  addressCity: 'address-city',
  addressPostcode: 'address-postcode',
  addressCountry: 'address-country',
  telephoneNumber: 'telephone-number',
  url: 'url'
}

const validationRuleOrgName = {
  field: clientFieldNames.name,
  validator: validateMandatoryField,
  maxLength: 255,
  fieldDisplayName: 'name'
}

const validationRules = [
  {
    field: clientFieldNames.addressLine1,
    validator: validateMandatoryField,
    maxLength: 255,
    fieldDisplayName: 'building and street'
  },
  {
    field: clientFieldNames.addressLine2,
    validator: validateOptionalField,
    maxLength: 255,
    fieldDisplayName: 'building and street'
  },
  {
    field: clientFieldNames.addressCity,
    validator: validateMandatoryField,
    maxLength: 255,
    fieldDisplayName: 'town or city'
  }
]

const validationRulesWithName = [
  validationRuleOrgName,
  ...validationRules
]

const validationRulesWithTelAndUrl = [
  {
    field: clientFieldNames.telephoneNumber,
    validator: validatePhoneNumber
  },
  {
    field: clientFieldNames.url,
    validator: validateUrl
  },
  ...validationRules
]

const validationRulesWithNameAndTelAndUrl = [
  validationRuleOrgName,
  ...validationRulesWithTelAndUrl
]

const trimField = (key, store) => lodash.get(store, key, '').trim()

const normaliseForm = (formBody) => {
  const fields = [
    clientFieldNames.name,
    clientFieldNames.addressLine1,
    clientFieldNames.addressLine2,
    clientFieldNames.addressCity,
    clientFieldNames.addressCountry,
    clientFieldNames.addressPostcode,
    clientFieldNames.telephoneNumber,
    clientFieldNames.url
  ]
  return fields.reduce((form, field) => {
    form[field] = trimField(field, formBody)
    return form
  }, {})
}

const validateForm = function validate (form, isRequestToGoLive, isStripeUpdateOrgDetails) {
  const rules = isStripeUpdateOrgDetails ? validationRulesWithName : isRequestToGoLive ? validationRulesWithTelAndUrl : validationRulesWithNameAndTelAndUrl

  const errors = rules.reduce((errors, validationRule) => {
    const value = form[validationRule.field]
    const validationResponse = validationRule.validator(value, validationRule.maxLength,
      validationRule.fieldDisplayName, true)
    if (!validationResponse.valid) {
      errors[validationRule.field] = validationResponse.message
    }
    return errors
  }, {})

  const country = form[clientFieldNames.addressCountry]
  if (!country || country.length !== 2) {
    errors[clientFieldNames.country] = 'Select a country'
  }

  const postCode = form[clientFieldNames.addressPostcode]
  const postCodeValidResponse = validatePostcode(postCode, country)
  if (!postCodeValidResponse.valid) {
    errors[clientFieldNames.addressPostcode] = postCodeValidResponse.message
  }
  const orderedErrors = lodash.pick(errors, Object.values(clientFieldNames))
  return orderedErrors
}

const submitForm = async function (form, serviceExternalId, correlationId, isRequestToGoLive, isStripeUpdateOrgDetails) {
  if (isStripeUpdateOrgDetails) {
    // TODO - Update Stripe Flag & Strip Org details
  } else {
    const updateRequest = new ServiceUpdateRequest()
      .replace(validPaths.merchantDetails.addressLine1, form[clientFieldNames.addressLine1])
      .replace(validPaths.merchantDetails.addressLine2, form[clientFieldNames.addressLine2])
      .replace(validPaths.merchantDetails.addressCity, form[clientFieldNames.addressCity])
      .replace(validPaths.merchantDetails.addressPostcode, form[clientFieldNames.addressPostcode])
      .replace(validPaths.merchantDetails.addressCountry, form[clientFieldNames.addressCountry])

    if (isRequestToGoLive) {
      updateRequest
        .replace(validPaths.merchantDetails.telephoneNumber, form[clientFieldNames.telephoneNumber])
        .replace(validPaths.merchantDetails.url, form[clientFieldNames.url])
        .replace(validPaths.currentGoLiveStage, goLiveStage.ENTERED_ORGANISATION_ADDRESS)
    } else {
      updateRequest
        .replace(validPaths.merchantDetails.telephoneNumber, form[clientFieldNames.telephoneNumber])
        .replace(validPaths.merchantDetails.url, form[clientFieldNames.url])
        .replace(validPaths.merchantDetails.name, form[clientFieldNames.name])
    }
    return updateService(serviceExternalId, updateRequest.formatPayload(), correlationId)
  }
}

const buildErrorsPageData = (form, errors, isRequestToGoLive) => {
  return {
    errors: errors,
    name: form[clientFieldNames.name],
    address_line1: form[clientFieldNames.addressLine1],
    address_line2: form[clientFieldNames.addressLine2],
    address_city: form[clientFieldNames.addressCity],
    address_postcode: form[clientFieldNames.addressPostcode],
    telephone_number: form[clientFieldNames.telephoneNumber],
    url: form[clientFieldNames.url],
    countries: countries.govukFrontendFormatted(form[clientFieldNames.addressCountry]),
    isRequestToGoLive
  }
}

module.exports = async function submitOrganisationAddress (req, res, next) {
  try {
    const isRequestToGoLive = Object.values(paths.service.requestToGoLive).includes(req.route && req.route.path)
    const isStripeUpdateOrgDetails = paths.account.yourPsp.stripeSetup.updateOrgDetails.includes(req.route && req.route.path)
    const form = normaliseForm(req.body)
    const errors = validateForm(form, isRequestToGoLive, isStripeUpdateOrgDetails)

    if (lodash.isEmpty(errors)) {
      const updatedService = await submitForm(form, req.service.externalId, req.correlationId, isRequestToGoLive, isStripeUpdateOrgDetails)
      if (isStripeUpdateOrgDetails) {
        // TO DO - After saving details to Stripe, redirect to the next Stripe setup index controller page
      } else if (isRequestToGoLive) {
        res.redirect(
          303,
          formatServicePathsFor(goLiveStageToNextPagePath[updatedService.currentGoLiveStage], req.service.externalId)
        )
      } else {
        res.redirect(303, formatServicePathsFor(paths.service.organisationDetails.index, req.service.externalId))
      }
    } else {
      const pageData = buildErrorsPageData(form, errors, isRequestToGoLive, isStripeUpdateOrgDetails)
      return response(req, res, 'request-to-go-live/organisation-address', pageData)
    }
  } catch (err) {
    next(err)
  }
}
