describe('Create Account page', () => {
  beforeEach(() => {
    cy.visit('/create-account');
  });

  it('renders the page title', () => {
    cy.contains('h1', 'Create Account').should('be.visible');
    cy.contains('Set up your Arcus Smart Home').should('be.visible');
  });

  it('shows step indicator with 4 steps', () => {
    // 4 step circles should be present
    cy.get('[class*="rounded-full"][class*="flex"]').should('have.length.at.least', 4);
  });

  it('starts on the credentials step', () => {
    cy.contains('h2', 'Account').should('be.visible');
  });

  it('renders all credential fields', () => {
    cy.get('input#firstName').should('be.visible');
    cy.get('input#lastName').should('be.visible');
    cy.get('input#email[type="email"]').should('be.visible');
    cy.get('input#phone[type="tel"]').should('be.visible');
    cy.get('input#password[type="password"]').should('be.visible');
    cy.get('input#confirmPassword[type="password"]').should('be.visible');
  });

  it('has an opt-in checkbox', () => {
    cy.contains('label', 'news and offers').should('be.visible');
    cy.contains('label', 'news and offers').find('input[type="checkbox"]').should('exist');
  });

  it('has a create account submit button', () => {
    cy.contains('button', 'Create Account').should('be.visible');
  });

  it('has a link back to login', () => {
    cy.contains('Already have an account?').should('be.visible');
    cy.contains('a', 'Log in').should('have.attr', 'href', '/login');
  });

  it('shows validation errors on empty submit', () => {
    cy.contains('button', 'Create Account').click();
    cy.get('.text-cardinal').should('have.length.at.least', 1);
  });
});
