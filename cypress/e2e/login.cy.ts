describe('Login page', () => {
  it('renders login form', () => {
    cy.visit('/login');
    cy.get('input[type="email"], input[name="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('shows validation errors for empty submit', () => {
    cy.visit('/login');
    cy.get('input[type="email"], input[name="email"]').clear();
    cy.get('input[type="password"]').clear();
    cy.get('button[type="submit"]').click();
    cy.get('p[class="error"]').first().should('have.text', "can't be blank");
    cy.get('p[class="error"]').last().should('have.text', "can't be blank");
  });

  it('shows email validation for invalid email', () => {
    cy.visit('/login');
    cy.get('input[type="email"], input[name="email"]').type('notanemail');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.contains(/invalid/i).should('be.visible');
  });
});
