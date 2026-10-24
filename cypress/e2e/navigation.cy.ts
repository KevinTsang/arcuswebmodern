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

  // it('debug page loads without authentication', () => {
  //   cy.visit('/debug');
  //   cy.contains('WebSocket Traffic').should('be.visible');
  // });

  it('login page has correct navigation links', () => {
    cy.visit('/login');
    cy.contains('a', 'Create An Account').click();
    cy.url().should('include', '/create-account');
  });

  it('create-account links back to login', () => {
    cy.visit('/create-account');
    cy.contains('a', 'Log in').click();
    cy.url().should('include', '/login');
  });

  it('invite page links back to login', () => {
    cy.visit('/invite');
    cy.contains('a', 'Log in').click();
    cy.url().should('include', '/login');
  });
});
