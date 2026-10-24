/**
 * PRD §25 — API keys (modern-only): list, create with a permission matrix,
 * copy the token, revoke and delete.
 */

import { tid } from '../support/selectors';

describe('API keys', () => {
  beforeEach(() => {
    cy.signIn({ path: '/settings/api-keys' });
  });

  it('lists existing keys with their permissions', () => {
    tid('apikeys-title').should('have.text', 'API Keys');
    cy.expectRequestAttrs('apikey:ListKeys', { placeId: 'place-maple' });
    tid('apikey-key-1').should('have.attr', 'data-expired', 'false').and('contain', 'Home Assistant');
    tid('apikey-prefix-key-1').should('have.text', 'ak_home...');
    tid('apikey-permissions-toggle-key-1').click();
    tid('apikey-key-1-perm-dev-all').should('be.checked');
    tid('apikey-key-1-perm-scene-x').should('be.checked');
    tid('apikey-key-1-perm-scene-r').should('not.be.checked');
  });

  it('creates a key, shows the token once, and cleans it up', () => {
    tid('apikey-new').click();
    tid('apikey-create').should('be.disabled');
    tid('apikey-label').type('Dashboard Widget');
    tid('apikey-create').should('be.disabled'); // needs a permission too
    tid('apikey-new-perm-dev-all').check();
    tid('apikey-new-perm-rule-r').check();
    tid('apikey-create').click();

    cy.expectRequest('apikey:Create').then((r) => {
      expect(r.destination).to.eq('SERV:place:place-maple');
      expect(r.attributes.label).to.eq('Dashboard Widget');
      expect(r.attributes.permissions).to.deep.eq(['dev:*', 'rule:r']);
    });
    tid('apikey-created').should('contain', 'Copy it now');
    tid('apikey-token').invoke('text').should('match', /^ak_.*secret-token/);

    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').as('copy').resolves();
    });
    tid('apikey-copy').click();
    cy.get('@copy').should('have.been.calledOnce');
    tid('apikey-copy').should('have.text', 'Copied');
    tid('apikey-dismiss').click();
    tid('apikey-created').should('not.exist');

    cy.platform().then((p) => {
      const created = p.data.apiKeys.find((k) => k.label === 'Dashboard Widget')!;
      tid(`apikey-${created.id}`).should('contain', 'Dashboard Widget');
    });
  });

  it('revokes, then deletes a key', () => {
    tid('apikey-revoke-key-1').click();
    cy.expectRequestAttrs('apikey:Revoke', { id: 'key-1' });
    tid('apikey-key-1').should('have.attr', 'data-expired', 'true').and('contain', 'Revoked');
    tid('apikey-revoke-key-1').should('not.exist');
    tid('apikey-delete-key-1').click();
    cy.expectRequestAttrs('apikey:Delete', { id: 'key-1' });
    tid('apikey-key-1').should('not.exist');
    tid('apikeys-empty').should('be.visible');
  });

  it('shows the platform error when creation is rejected', () => {
    cy.platform().invoke('failRequest', 'apikey:Create', 'error.request.rejected', 'Unable to create key');
    tid('apikey-new').click();
    tid('apikey-label').type('Rejected key');
    tid('apikey-new-perm-place-r').check();
    tid('apikey-create').click();
    tid('apikey-error').should('have.text', 'Unable to create key');
  });
});
