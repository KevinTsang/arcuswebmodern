// Mock crypto.randomUUID for uiSlice (runs before framework via setupFiles)
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => `test-${Math.random().toString(36).slice(2)}`,
    },
  });
}
