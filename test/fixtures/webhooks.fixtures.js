function validWebhook(options = {}) {
  return {
    external_id: options.external_id || 'valid-webhooks-external-id',
    service_id: options.service_id || 'valid-service-id',
    live: options.live !== undefined ? options.live : true,
    callback_url: options.callback_url || 'https://some-callback-url.com',
    description: options.description || 'a valid webhook description',
    status: options.status || 'ACTIVE',
    created_date: options.created_date || '2021-08-20T14:00:00.000Z',
    subscriptions: options.subscriptions || [ 'card_payment_captured' ]
  }
}

function validSigningSecret(options = {}) {
  return {
    signing_key: options.signing_key || 'valid-signing-secret'
  }
}

function webhooksListResponse(options = []) {
  return options.map((option) => validWebhook(option))
}

function webhookResponse(options = {}) {
  return validWebhook(options)
}

function webhookSigningSecretResponse(options = {}) {
  return validSigningSecret(options)
}

module.exports = {
  webhooksListResponse,
  webhookResponse,
  webhookSigningSecretResponse
}
