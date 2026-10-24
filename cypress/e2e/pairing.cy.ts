/**
 * PRD §§19, 22 — Product catalog, device pairing wizard, hub registration
 * and kit activation. Devices/hubs paired here are removed by the cleanup.
 */

import {
  Base, Device, PairingDevice, PairingSubsystem, Place,
} from '../../packages/arcus-core/src/capabilities/capabilities';
import { DEVICE, PRODUCT, addr } from '../support/platform/fixtures';
import { tid } from '../support/selectors';

const PAIRING = addr.subsystem('subpairing');
const product = (id: string) => tid(`product-${id}`);

describe('Product catalog', () => {
  beforeEach(() => {
    cy.signIn({ path: '/product-catalog' });
  });

  it('browses by brand and filters by hub requirement', () => {
    tid('catalog-title').should('have.text', 'Product Catalog');
    tid('catalog-count').should('have.text', '3 products');
    tid('catalog-brand-acme').should('have.text', 'Acme (1)');

    tid('catalog-brand-globex').click();
    tid('catalog-heading').should('have.text', 'Globex');
    tid('catalog-count').should('have.text', '1 product');
    product(PRODUCT.lock).should('exist');
    product(PRODUCT.plug).should('not.exist');

    tid('catalog-brand-all').click();
    tid('catalog-filter-no-hub-required').click();
    product(PRODUCT.camera).should('exist');
    product(PRODUCT.plug).should('not.exist');
    tid('catalog-filter-hub-required').click();
    tid('catalog-count').should('have.text', '2 products');
    tid(`product-hub-required-${PRODUCT.plug}`).should('exist');
  });

  it('searches products', () => {
    tid('catalog-search').type('camera{enter}');
    cy.expectRequestAttrs('prodcat:FindProducts', { search: 'camera' });
    tid('catalog-heading').should('have.text', 'Search results for "camera"');
    product(PRODUCT.camera).should('exist');
    product(PRODUCT.lock).should('not.exist');
    tid('catalog-search-clear').click();
    tid('catalog-count').should('have.text', '3 products');
  });

  it('refuses to pair a hub-required device without a hub', () => {
    cy.platform().invoke('removeEntity', addr.hub);
    const alert = cy.stub();
    cy.on('window:alert', alert);
    cy.wrap(alert).as('alert');
    product(PRODUCT.plug).click();
    cy.get('@alert').should('have.been.calledWithMatch', /Smart Hub is required/);
    cy.location('pathname').should('eq', '/product-catalog');
  });
});

describe('Device pairing', () => {
  it('pairs a device from the catalog and lands on the devices page', () => {
    cy.signIn({ path: '/product-catalog' });
    product(PRODUCT.plug).click();
    cy.location('pathname').should('eq', '/pairing');
    tid('pairing-title').should('have.text', 'Pair Acme Acme Smart Plug');

    cy.expectRequestAttrs(PairingSubsystem.CMD_STARTPAIRING, { productAddress: `SERV:product:${PRODUCT.plug}` });
    tid('pairing-step').should('have.text', 'Step 1 of 2');
    tid('pairing-instructions').should('contain', 'Plug the device into a wall outlet.');
    tid('pairing-prev').should('not.exist');
    tid('pairing-next').click();
    tid('pairing-step').should('have.text', 'Step 2 of 2');
    tid('pairing-prev').should('exist');
    tid('pairing-search').click();

    cy.expectRequest(PairingSubsystem.CMD_SEARCH, (r) => r.destination === PAIRING);
    tid('pairing-searching').should('have.attr', 'data-timed-out', 'false').and('contain', 'Looking for your Acme Smart Plug');

    // The hub polls every 3s; the fake device joins after ~1.5s.
    cy.get('[data-testid="pairing-device-name"]', { timeout: 15000 }).type('Patio Plug');
    tid('pairing-favorite').check();
    tid('pairing-customize-save').click();

    cy.expectRequest(PairingDevice.CMD_CUSTOMIZE);
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination.startsWith('DRIV:dev:') && r.attributes[Device.ATTR_NAME] === 'Patio Plug');
    cy.expectRequestAttrs(PairingDevice.CMD_ADDCUSTOMIZATION, { customization: 'FAVORITE' });
    tid('pairing-complete').should('have.attr', 'data-mispaired', 'false');
    tid('pairing-complete-title').should('have.text', 'Device Paired!');
    tid('pairing-complete-message').should('have.text', 'Acme Acme Smart Plug has been successfully paired.');

    tid('pairing-finish').click();
    cy.expectRequest(PairingSubsystem.CMD_DISMISSALL);
    cy.location('pathname').should('eq', '/devices');
    cy.platform().then((p) => {
      expect(p.entitiesIn('SERV', 'pairdev')).to.be.empty;
      expect(p.created.size, 'only the paired device remains for cleanup').to.eq(1);
      const [deviceAddress] = [...p.created];
      tid(`device-name-${deviceAddress}`).should('have.text', 'Patio Plug');
    });
  });

  it('stops searching when pairing is cancelled', () => {
    cy.signIn({ path: '/product-catalog' });
    product(PRODUCT.lock).click();
    tid('pairing-next').click();
    tid('pairing-search').click();
    tid('pairing-searching').should('exist');
    tid('pairing-cancel').click();
    cy.location('pathname').should('eq', '/product-catalog');
    cy.expectRequest(PairingSubsystem.CMD_STOPSEARCHING, (r) => r.destination === PAIRING);
  });

  it('reports a failure to start pairing', () => {
    cy.signIn({ path: '/product-catalog' });
    cy.platform().invoke('failRequest', PairingSubsystem.CMD_STARTPAIRING);
    product(PRODUCT.plug).click();
    cy.toast('Failed to start pairing');
  });
});

describe('Hub setup', () => {
  beforeEach(() => {
    cy.signIn({
      path: '/hub-setup',
      customize: (p) => {
        delete p.data.entities[addr.hub];
      },
    });
  });

  it('registers a hub and names it', () => {
    tid('hub-product-dee001').click();
    cy.location('pathname').should('eq', '/pairing');
    tid('hub-register-title').should('have.text', 'Register Your Hub');

    tid('hub-register').should('be.disabled');
    tid('hub-id-input').type('abc-1234');
    tid('hub-register').click();
    cy.expectRequest(Place.CMD_REGISTERHUBV2, (r) =>
      r.destination === addr.place && r.attributes.hubId === 'ABC-1234');

    cy.get('[data-testid="pairing-device-name"]', { timeout: 15000 }).type('Cabin Hub');
    tid('pairing-favorite').should('not.exist');
    tid('pairing-customize-save').click();
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === 'SERV:ABC-1234:hub' && r.attributes[Device.ATTR_NAME] === 'Cabin Hub');
    tid('pairing-complete-title').should('have.text', 'Hub Ready!');

    tid('pairing-finish').click();
    cy.location('pathname').should('eq', '/devices');
    cy.platform().its('created.size').should('eq', 1);
  });

  it('explains an already-registered hub and lets the user retry', () => {
    tid('hub-product-dee000').click();
    tid('hub-id-input').type('ZZZ-0000');
    tid('hub-register').click();
    cy.get('[data-testid="hub-registration"]', { timeout: 15000 })
      .should('have.attr', 'data-state', 'error.register.alreadyregistered');
    tid('hub-registration-error').should('contain', 'already registered to another account');
    tid('hub-retry').click();
    tid('hub-register-title').should('have.text', 'Register Your Hub');
    tid('hub-id-input').should('have.value', '');
  });

  it('rejects an invalid hub id', () => {
    tid('hub-product-dee000').click();
    tid('hub-id-input').type('nope');
    tid('hub-register').click();
    cy.get('[data-testid="hub-registration-error"]', { timeout: 15000 }).should('contain', 'Invalid Hub ID');
  });

  it('links to hub-free devices', () => {
    tid('hub-setup-browse').click();
    cy.location('pathname').should('eq', '/product-catalog');
  });
});

describe('Kit activation', () => {
  const pairingAddress = addr.pairingDevice('kit-lamp');
  const LAMP_PROTO = 'PROT:ZIGB:proto-lamp';
  const MISSING_PROTO = 'PROT:ZIGB:proto-missing';

  beforeEach(() => {
    cy.signIn({
      path: '/kit-activate',
      customize: (p) => {
        p.data.kitInfo = [
          { productId: PRODUCT.plug, protocolAddress: LAMP_PROTO },
          { productId: PRODUCT.lock, protocolAddress: MISSING_PROTO },
        ];
        p.data.entities[pairingAddress] = {
          [Base.ATTR_ADDRESS]: pairingAddress,
          [Base.ATTR_ID]: 'kit-lamp',
          [Base.ATTR_TYPE]: 'pairdev',
          [PairingDevice.ATTR_PAIRINGSTATE]: PairingDevice.PAIRINGSTATE_PAIRED,
          [PairingDevice.ATTR_PAIRINGPHASE]: PairingDevice.PAIRINGPHASE_PAIRED,
          [PairingDevice.ATTR_PROTOCOLADDRESS]: LAMP_PROTO,
          [PairingDevice.ATTR_DEVICEADDRESS]: DEVICE.lamp,
          [PairingDevice.ATTR_CUSTOMIZATIONS]: [],
        };
      },
    });
  });

  it('shows kit device states and customizes a ready device', () => {
    tid('kit-title').should('have.text', 'Kit Activation');
    tid(`kit-device-${LAMP_PROTO}`).should('have.attr', 'data-state', 'customizable').and('contain', 'Acme Smart Plug');
    tid(`kit-device-${MISSING_PROTO}`).should('have.attr', 'data-state', 'missing').and('contain', 'Globex Deadbolt');
    tid('kit-finish').should('have.attr', 'data-complete', 'false').and('have.text', 'Finish Later');

    tid(`kit-setup-${LAMP_PROTO}`).click();
    tid('kit-device-name').type('Kitchen Plug');
    tid('kit-save').click();

    cy.expectRequest(PairingDevice.CMD_CUSTOMIZE, (r) => r.destination === pairingAddress);
    cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>
      r.destination === DEVICE.lamp && r.attributes[Device.ATTR_NAME] === 'Kitchen Plug');
    cy.expectRequestAttrs(PairingDevice.CMD_ADDCUSTOMIZATION, { customization: 'NAME' });
    tid(`kit-device-${LAMP_PROTO}`).should('have.attr', 'data-state', 'active');
    cy.get('[data-testid^="kit-setup-"]').should('not.exist');

    // Every kit device is now active, so the header button flips to Done.
    tid('kit-finish').should('have.attr', 'data-complete', 'true').and('have.text', 'Done').click();
    cy.expectRequest(PairingSubsystem.CMD_DISMISSALL);
    cy.location('pathname').should('eq', '/devices');
  });

  it('shows an empty state when the kit has no devices', () => {
    cy.platform().then((p) => { p.data.kitInfo = []; });
    cy.reload();
    cy.get('[data-testid="kit-empty"]', { timeout: 20000 }).should('be.visible');
    tid('kit-go-devices').click();
    cy.location('pathname').should('eq', '/devices');
  });
});
