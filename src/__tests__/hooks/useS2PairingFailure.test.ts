import { act, renderHook } from '@testing-library/react';
import { Base } from '@arcus/core';
import cornea from '@arcus/core/cornea';
import { PAIRING_FAILED_EVENT, useS2PairingFailure } from '@/hooks/useS2PairingFailure';
import { S2_PIN_FAILED, S2_PIN_TIMEOUT } from '@/lib/zwaveS2';

const SUB = 'SERV:subpairing:place-1';

function emitFailed(code: string | undefined, address = SUB) {
  act(() => {
    cornea.emit(PAIRING_FAILED_EVENT, { [Base.ATTR_ADDRESS]: address, code });
  });
}

afterEach(() => {
  cornea.removeAllListeners(PAIRING_FAILED_EVENT);
});

describe('useS2PairingFailure', () => {
  it('starts with no failure', () => {
    const { result } = renderHook(() => useS2PairingFailure(SUB));
    expect(result.current[0]).toBeNull();
  });

  it.each([S2_PIN_TIMEOUT, S2_PIN_FAILED])('reports %s', (code) => {
    const { result } = renderHook(() => useS2PairingFailure(SUB));
    emitFailed(code);
    expect(result.current[0]).toBe(code);
  });

  it('ignores other pairing failures', () => {
    const { result } = renderHook(() => useS2PairingFailure(SUB));
    emitFailed('pairing.failed');
    emitFailed(undefined);
    expect(result.current[0]).toBeNull();
  });

  it("ignores another place's pairing subsystem", () => {
    const { result } = renderHook(() => useS2PairingFailure(SUB));
    emitFailed(S2_PIN_FAILED, 'SERV:subpairing:place-2');
    expect(result.current[0]).toBeNull();
  });

  it('clears on dismiss', () => {
    const { result } = renderHook(() => useS2PairingFailure(SUB));
    emitFailed(S2_PIN_TIMEOUT);
    act(() => result.current[1]());
    expect(result.current[0]).toBeNull();
  });

  it('stops listening on unmount', () => {
    const { unmount } = renderHook(() => useS2PairingFailure(SUB));
    expect(cornea.listeners(PAIRING_FAILED_EVENT)).toHaveLength(1);
    unmount();
    expect(cornea.listeners(PAIRING_FAILED_EVENT)).toHaveLength(0);
  });
});
