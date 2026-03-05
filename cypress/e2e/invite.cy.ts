describe('Invite page', () => {
  beforeEach(() => {
    cy.visit('/invite');
  });

  it('renders the page title', () => {
    cy.contains('h1', 'Accept Invitation').should('be.visible');
    cy.contains('Join an Arcus Smart Home').should('be.visible');
  });

  it('renders invitation code and email fields', () => {
    cy.get('input#inviteCode').should('be.visible');
    cy.get('input#inviteeEmail[type="email"]').should('be.visible');
  });

  it('has a look up invitation button', () => {
    cy.contains('button', 'Look Up Invitation').should('be.visible');
  });

  it('disables submit when fields are empty', () => {
    cy.contains('button', 'Look Up Invitation').should('be.disabled');
  });

  it('enables submit when both fields are filled', () => {
    cy.get('input#inviteCode').type('ABC123');
    cy.get('input#inviteeEmail').type('test@example.com');
    cy.contains('button', 'Look Up Invitation').should('not.be.disabled');
  });

  it('has a link back to login', () => {
    cy.contains('Already have an account?').should('be.visible');
    cy.contains('a', 'Log in').should('have.attr', 'href', '/login');
  });

  it('shows instructions text', () => {
    cy.contains('invitation code from your email').should('be.visible');
  });
});
