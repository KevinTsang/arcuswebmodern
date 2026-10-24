/**
 * Selector helpers shared by the specs.
 *
 * Specs select elements by `data-testid` and reserve `cy.contains` for
 * asserting visible text — see testing.md → "data-testid conventions".
 */

/** `cy.get` an element by its `data-testid`. */
export const tid = (id: string) => cy.get(`[data-testid="${id}"]`);
