import { resolveDeviceConfig } from '@/lib/deviceConfig';

describe('resolveDeviceConfig – multi-switch auto-detection', () => {
  it('sets action to multi-toggle for dual-relay device', () => {
    const device = {
      'base:caps': ['base', 'swit', 'devconn'],
      'base:instances': { relay1: ['swit'], relay2: ['swit'] },
      'dev:devtypehint': 'Switch',
    };
    const config = resolveDeviceConfig(device);
    expect(config['web:panel:action']).toBe('multi-toggle');
    expect(config['web:card:action']).toBe('multi-toggle');
  });

  it('sets action to multi-toggle for dual-outlet device', () => {
    const device = {
      'base:caps': ['base', 'swit', 'devconn'],
      'base:instances': { outlet1: ['swit'], outlet2: ['swit'] },
      'dev:devtypehint': 'Switch',
    };
    const config = resolveDeviceConfig(device);
    expect(config['web:panel:action']).toBe('multi-toggle');
    expect(config['web:card:action']).toBe('multi-toggle');
  });

  it('does not override action for single-instance device', () => {
    const device = {
      'base:caps': ['base', 'swit', 'devconn'],
      'base:instances': { relay1: ['swit'] },
      'dev:devtypehint': 'Switch',
    };
    const config = resolveDeviceConfig(device);
    expect(config['web:panel:action']).toBe('toggle-on-off');
    expect(config['web:card:action']).toBe('toggle-on-off');
  });

  it('does not override action when no base:instances', () => {
    const device = {
      'base:caps': ['base', 'swit', 'devconn'],
      'dev:devtypehint': 'Switch',
      'swit:state': 'ON',
    };
    const config = resolveDeviceConfig(device);
    expect(config['web:panel:action']).toBe('toggle-on-off');
    expect(config['web:card:action']).toBe('toggle-on-off');
  });

  it('does not set multi-toggle when instances have no swit capability', () => {
    const device = {
      'base:caps': ['base', 'temp'],
      'base:instances': { sensor1: ['temp'], sensor2: ['temp'] },
      'dev:devtypehint': 'Switch',
    };
    const config = resolveDeviceConfig(device);
    expect(config['web:panel:action']).not.toBe('multi-toggle');
  });

  it('overrides even product-specific config for multi-switch', () => {
    // Use a known product ID that sets toggle-on-off
    const device = {
      'base:caps': ['base', 'swit', 'devconn'],
      'base:instances': { relay1: ['swit'], relay2: ['swit'] },
      'dev:devtypehint': 'Switch',
      'dev:productId': '0c9a66',
    };
    const config = resolveDeviceConfig(device);
    expect(config['web:panel:action']).toBe('multi-toggle');
  });
});
