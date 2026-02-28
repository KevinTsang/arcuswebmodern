describe('Navigation', () => {
  it('root redirects to login when unauthenticated', () => {
    cy.visit('/');
    cy.url().should('include', '/login');
  });

  it('create-account page loads', () => {
    cy.visit('/create-account');
    cy.contains(/create|account|sign up/i).should('be.visible');
  });

  it('invite page loads', () => {
    cy.visit('/invite');
    cy.contains(/invite|invitation|code/i).should('be.visible');
  });
});
