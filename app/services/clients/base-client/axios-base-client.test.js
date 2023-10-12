'use strict'

const nock = require('nock')
const sinon = require('sinon')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const { Client } = require('./axios-base-client')

chai.use(chaiAsPromised)
const { expect } = chai

const baseUrl = 'http://localhost:8000'
const app = 'an-app'

describe('Axios base client', () => {
  const requestStartSpy = sinon.spy()
  const requestSuccessSpy = sinon.spy()
  const requestFailureSpy = sinon.spy()
  const client = new Client(app)
  client.configure(baseUrl, {
    onRequestStart: requestStartSpy,
    onSuccessResponse: requestSuccessSpy,
    onFailureResponse: requestFailureSpy
  })

  beforeEach(() => {
    requestStartSpy.resetHistory()
    requestFailureSpy.resetHistory()
    requestSuccessSpy.resetHistory()
  })

  describe('Response and hooks', () => {
    it('should return response and call success hook on 200 response', () => {
      const body = { foo: 'bar' }
      nock(baseUrl)
        .get('/')
        .reply(200, body)

      return expect(client.get('/', 'foo')).to.be.fulfilled.then((response) => {
        expect(response.data).to.deep.equal(body)
      })
    })

    it('should throw error and call failure hook on 400 response', () => {
      const body = {
        error_identifier: 'AN-ERROR',
        message: 'a-message'
      }
      nock(baseUrl)
        .get('/')
        .reply(400, body)

      return expect(client.get('/', 'foo')).to.be.rejected.then((error) => {
        expect(error.message).to.equal('a-message')
        expect(error.errorCode).to.equal(400)
        expect(error.errorIdentifier).to.equal('AN-ERROR')
        expect(error.service).to.equal(app)
      })
    })

    it('should throw error and call failure hook on 500 response', () => {
      const body = {
        error_identifier: 'AN-ERROR',
        message: 'a-message'
      }
      nock(baseUrl)
        .get('/')
        .reply(500, body)

      return expect(client.get('/', 'foo')).to.be.rejected.then((error) => {
        expect(error.message).to.equal('a-message')
        expect(error.errorCode).to.equal(500)
        expect(error.errorIdentifier).to.equal('AN-ERROR')
        expect(error.service).to.equal(app)
      })
    })
  })

  describe('Retries', () => {
    it('should retry 3 times when ECONNRESET error thrown', () => {
      nock(baseUrl)
        .get('/')
        .times(3)
        .replyWithError({
          code: 'ECONNRESET',
          response: { status: 500 }
        })

      return expect(client.get('/', 'foo')).to.be.rejected.then(error => {
        expect(error.errorCode).to.equal(500)
        sinon.assert.calledThrice(requestStartSpy)
        requestStartSpy.getCall(0).calledWithMatch({
          method: 'get',
          url: '/'
        })
        requestStartSpy.getCall(1).calledWithMatch({
          method: 'get',
          url: '/',
          retryCount: 2
        })
        requestStartSpy.getCall(2).calledWithMatch({
          method: 'get',
          url: '/',
          retryCount: 3
        })
        sinon.assert.calledThrice(requestFailureSpy)
        sinon.assert.calledWithMatch(requestFailureSpy, { retry: true })
        expect(nock.isDone()).to.eq(true)
      })
    })

    it('should not retry for an error other than ECONNRESET', () => {
      nock(baseUrl)
        .get('/')
        .replyWithError({
          response: { status: 500 }
        })

      return expect(client.get('/')).to.be.rejected.then(error => {
        expect(error.errorCode).to.equal(500)
        sinon.assert.calledOnce(requestStartSpy)
        sinon.assert.calledOnce(requestFailureSpy)
        expect(requestFailureSpy.getCall(0).args.retry === undefined)
        expect(nock.isDone()).to.eq(true)
      })
    })
  })
})
