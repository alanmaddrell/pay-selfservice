const userStubs = require('../../stubs/user-stubs')

describe('Edit phone number flow', () => {
  const userExternalId = 'cd0fa54cf3b7408a80ae2f1b93e7c16e'
  const testPhoneNumber = '+441234567890'
  const testPhoneNumberNew = '+441987654321'

  describe('Pre edit', () => {
    beforeEach(() => {
      cy.setEncryptedCookies(userExternalId)
      cy.task('setupStubs', [
        userStubs.getUserSuccess({ userExternalId, telephoneNumber: testPhoneNumber })
      ])
    })

    describe('Profile page', () => {
      it('should show a link to change phone number', () => {
        cy.visit('/my-profile')
        cy.percySnapshot()
        cy.get('#telephone-number').should('contain', testPhoneNumber)
        cy.get('#change-phone-link').should('exist').click()
      })
    })

    describe('Edit phone number page', () => {
      it('should show current phone number in text input', () => {
        cy.get('input[name="phone"]').should('exist')
        cy.get('input[name="phone"]').should('have.attr', 'value', testPhoneNumber)
      })

      it('should show an error if an invalid number is typed', () => {
        cy.visit('/my-profile/phone-number')
        cy.percySnapshot()
        cy.get('input[name="phone"]').clear().type('not a number')
        cy.get('#save-phone-number').click()
        cy.get('.govuk-error-summary').should('exist')
        cy.get('input[name="phone"]').should('have.class', 'govuk-input--error')
      })
    })
  })
  describe('Post edit', () => {
    beforeEach(() => {
      cy.setEncryptedCookies(userExternalId)
      cy.task('setupStubs', [
        userStubs.getUserSuccess({ userExternalId, telephoneNumber: testPhoneNumberNew }),
        userStubs.patchUpdateUserPhoneNumberSuccess(userExternalId, testPhoneNumberNew)
      ])
    })

    it('should save changes and redirect to my profile', () => {
      cy.visit('/my-profile/phone-number')
      cy.percySnapshot()
      cy.get('input[name="phone"]').clear().type(testPhoneNumberNew)
      cy.get('#save-phone-number').click()
      cy.get('.govuk-notification-banner--success').should('exist').should('contain', 'Phone number updated')
      cy.get('#telephone-number').should('contain', testPhoneNumberNew)
    })
  })
})
