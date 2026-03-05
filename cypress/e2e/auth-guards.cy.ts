describe('Auth guards - protected routes redirect to login', () => {
  const protectedRoutes = [
    '/home',
    '/devices',
    '/settings',
    '/scenes',
    '/rules',
    '/history',
    '/services',
    '/preferences',
    '/pairing',
    '/hub-setup',
    '/kit-activate',
    '/product-catalog',
    '/promonitoring',
  ];

  protectedRoutes.forEach((route) => {
    it(`${route} redirects unauthenticated users`, () => {
      cy.visit(route);
      cy.url().should('include', '/login');
    });
  });
});
