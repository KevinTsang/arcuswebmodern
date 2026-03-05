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
    cy.contains("p", "can't be blank").should('be.visible');
  });

  it('shows email validation for invalid email', () => {
    cy.visit('/login');
    cy.get('input[type="email"], input[name="email"]').type('notanemail');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.contains(/invalid/i).should('be.visible');
  });

  it('shows branding panel on desktop', () => {
    cy.viewport(1024, 768);
    cy.visit('/login');
    cy.contains('Arcus').should('be.visible');
    cy.contains('Smart Home').should('be.visible');
  });

  it('has a public computer checkbox', () => {
    cy.visit('/login');
    cy.get('input#isPublic[type="checkbox"]').should('exist').and('not.be.checked');
    cy.get('label[for="isPublic"]').should('contain.text', 'public computer');
  });

  it('has a link to create account', () => {
    cy.visit('/login');
    cy.contains('a', 'Create An Account').should('have.attr', 'href', '/create-account');
  });

  it('has a link to forgot password', () => {
    cy.visit('/login');
    cy.contains('a', 'Forgot Password?').should('have.attr', 'href', '/login?view=send-code');
  });

  it('has a link to use invitation code', () => {
    cy.visit('/login');
    cy.contains('a', 'Use Invitation Code').should('have.attr', 'href', '/invite');
  });
});

describe('Forgot password flow', () => {
  it('renders send-code form', () => {
    cy.visit('/login?view=send-code');
    cy.contains('Forgot Password').should('be.visible');
    cy.get('input#resetEmail[type="email"]').should('be.visible');
    cy.contains('button', 'Send Email').should('be.visible');
    cy.contains('button', 'Back').should('be.visible');
  });

  it('has a link to enter code from support', () => {
    cy.visit('/login?view=send-code');
    cy.contains('a', /already have a code/i).should('have.attr', 'href', '/login?view=reset-password');
  });

  it('renders reset-password form', () => {
    cy.visit('/login?view=reset-password');
    cy.contains(/already have a code from support/i).should('be.visible');
    cy.get('input#rpEmail[type="email"]').should('be.visible');
    cy.get('input#code').should('be.visible');
    cy.get('input#newPassword[type="password"]').should('be.visible');
    cy.get('input#confirmPassword[type="password"]').should('be.visible');
    cy.contains('button', 'Reset Password').should('be.visible');
  });

  it('shows password requirements on reset form', () => {
    cy.visit('/login?view=reset-password');
    cy.contains('case-sensitive').should('be.visible');
    cy.contains('at least 8 characters').should('be.visible');
    cy.contains('1 letter').should('be.visible');
    cy.contains('Cannot use spaces').should('be.visible');
  });

  it('renders reset confirmation', () => {
    cy.visit('/login?view=reset-confirmation');
    cy.contains('Password Reset').should('be.visible');
    cy.contains('successfully been reset').should('be.visible');
    cy.contains('a', 'Back to login').should('have.attr', 'href', '/login');
  });
});
