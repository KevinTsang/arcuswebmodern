describe('Dashboard', () => {
  it('home page redirects unauthenticated users', () => {
    cy.visit('/home');
    cy.url().should('include', '/login');
  });

  it('devices page redirects unauthenticated users', () => {
    cy.visit('/devices');
    cy.url().should('include', '/login');
  });

  it('settings page redirects unauthenticated users', () => {
    cy.visit('/settings');
    cy.url().should('include', '/login');
  });

  it('scenes page redirects unauthenticated users', () => {
    cy.visit('/scenes');
    cy.url().should('include', '/login');
  });

  it('rules page redirects unauthenticated users', () => {
    cy.visit('/rules');
    cy.url().should('include', '/login');
  });
});
