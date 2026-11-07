/**
 * Fakes the browser's passkey prompt (WebAuthn) in the app window, so specs
 * can log in with a passkey without an authenticator. Call it from
 * `cy.visit`'s `onBeforeLoad`, before the app checks for passkey support.
 */

export type PasskeyPrompt =
  /** The person picks the passkey with this credential id. */
  | { credentialId: string }
  /** The prompt ends with this DOMException, as a dismissed prompt does. */
  | { error: 'NotAllowedError' | 'AbortError' };

export function fakePasskeyPrompt(win: Cypress.AUTWindow, prompt: PasskeyPrompt): void {
  Object.defineProperty(win, 'PublicKeyCredential', {
    configurable: true,
    writable: true,
    value: { parseRequestOptionsFromJSON: (options: object) => options },
  });
  Object.defineProperty(win.navigator, 'credentials', {
    configurable: true,
    value: {
      get: () => ('error' in prompt
        ? Promise.reject(new win.DOMException('The passkey prompt ended', prompt.error))
        : Promise.resolve({
          toJSON: () => ({
            id: prompt.credentialId,
            rawId: prompt.credentialId,
            type: 'public-key',
            response: {},
            clientExtensionResults: {},
          }),
        })),
    },
  });
}
