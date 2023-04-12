const inviteStubs = require('../../stubs/invite-stubs')
const userStubs = require('../../stubs/user-stubs')
const gatewayAccountStubs = require('../../stubs/gateway-account-stubs')

const inviteCode = 'an-invite-code'
const email = 'foo@example.com'
const userExternalId = 'a-user-id'
const serviceExternalId = 'a-service-external-id'
const gatewayAccountId = '1'

describe('Complete an invite for an existing user', () => {
  it('Should redirect to the my services page with a success notification', () => {
    cy.task('setupStubs', [
      inviteStubs.getInviteSuccess({
        code: inviteCode,
        user_exist: true,
        is_invite_to_join_service: true,
        email
      }),
      inviteStubs.completeInviteToServiceSuccess(inviteCode, userExternalId, serviceExternalId),
      userStubs.getUserSuccess({
        userExternalId,
        email,
        serviceExternalId,
        serviceName: 'Cake service',
        gatewayAccountId
      }),
      gatewayAccountStubs.getGatewayAccountsSuccess({
        gatewayAccountId
      })
    ])

    cy.setEncryptedCookies(userExternalId)

    cy.visit(`/invites/${inviteCode}`)
    cy.percySnapshot()

    cy.title().should('eq', 'Choose service - GOV.UK Pay')

    cy.get('.govuk-notification-banner--success').should('exist').should('contain', 'You have been added to Cake service')
  })
})
