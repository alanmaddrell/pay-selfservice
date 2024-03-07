'use strict'

const sinon = require('sinon')
const proxyquire = require('proxyquire')
const { expect } = require('chai')
const transactionDetailsFixtures = require('../../../test/fixtures/ledger-transaction.fixtures')

const configureSpy = sinon.spy()

const validCreatedTransactionDetailsResponse = transactionDetailsFixtures.validTransactionCreatedDetailsResponse({
  transaction_id: 'ch_123abc456xyz',
  type: 'payment',
  amount: 100,
  fee: 5,
  net_amount: 95,
  refund_summary_available: 100
})

class MockClient {
  configure (baseUrl, options) {
    configureSpy(baseUrl, options)
  }

  async get (url, description) {
    return Promise.resolve({ data: validCreatedTransactionDetailsResponse })
  }
}

function getLedgerClient () {
  return proxyquire('./ledger.client', {
    '@govuk-pay/pay-js-commons/lib/utils/axios-base-client/axios-base-client': { Client: MockClient }
  })
}

describe('Ledger client', () => {
  describe('transaction function', () => {
    beforeEach(() => {
      configureSpy.resetHistory()
    })

    it('should use default base URL when base URL has not been set', async () => {
      const ledgerClient = getLedgerClient()

      await ledgerClient.transaction('id', 'a-gateway-account-id', {})

      expect(configureSpy.getCall(0).args[0]).to.equal('http://127.0.0.1:8006/v1/transaction/id?account_id=a-gateway-account-id')
    })

    it('should use configured base url', async () => {
      const ledgerClient = getLedgerClient()

      await ledgerClient.transaction('id', 'a-gateway-account-id', { baseUrl: 'https://example.com' })

      expect(configureSpy.getCall(0).args[0]).to.equal('https://example.com/v1/transaction/id?account_id=a-gateway-account-id')
    })
  })
})
