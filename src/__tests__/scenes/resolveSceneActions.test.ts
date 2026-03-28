import { resolveSceneActions } from '@/components/scenes/resolveSceneActions';
import Bridge from '@arcus/core/bridge';
import { SceneService } from '@arcus/core/services';

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

jest.mock('@arcus/core/services', () => ({
  SceneService: { ListSceneTemplates: jest.fn() },
}));

const mockListTemplates = SceneService.ListSceneTemplates as jest.Mock;
const mockBridge = Bridge.request as jest.Mock;

const templates = [
  { 'base:address': 'SERV:scenetmpl:home', 'base:id': 'home', 'scenetmpl:custom': false },
  { 'base:address': 'SERV:scenetmpl:custom', 'base:id': 'custom', 'scenetmpl:custom': true },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockListTemplates.mockResolvedValue({ sceneTemplates: templates });
  mockBridge.mockResolvedValue({
    actions: [
      { id: 'switches', name: 'Lights', satisfiable: true, selectors: { 'DRIV:dev:a': [] } },
    ],
  });
});

describe('resolveSceneActions', () => {
  it('calls ListSceneTemplates with placeId', async () => {
    await resolveSceneActions('place-1');
    expect(mockListTemplates).toHaveBeenCalledWith('place-1');
  });

  it('calls ResolveActions on the custom template by default', async () => {
    await resolveSceneActions('place-1');
    expect(mockBridge).toHaveBeenCalledWith(
      'scenetmpl:ResolveActions',
      'SERV:scenetmpl:custom',
      { placeId: 'place-1' },
    );
  });

  it('calls ResolveActions on the matching template when templateId provided', async () => {
    await resolveSceneActions('place-1', 'home');
    expect(mockBridge).toHaveBeenCalledWith(
      'scenetmpl:ResolveActions',
      'SERV:scenetmpl:home',
      { placeId: 'place-1' },
    );
  });

  it('falls back to custom template if templateId not found', async () => {
    await resolveSceneActions('place-1', 'nonexistent');
    expect(mockBridge).toHaveBeenCalledWith(
      'scenetmpl:ResolveActions',
      'SERV:scenetmpl:custom',
      { placeId: 'place-1' },
    );
  });

  it('returns parsed actions and template address', async () => {
    const result = await resolveSceneActions('place-1');
    expect(result.templateAddress).toBe('SERV:scenetmpl:custom');
    expect(result.actions).toEqual([
      expect.objectContaining({ id: 'switches', name: 'Lights', satisfiable: true }),
    ]);
  });

  it('sorts actions alphabetically by name', async () => {
    mockBridge.mockResolvedValue({
      actions: [
        { id: 'b', name: 'Zulu', satisfiable: true, selectors: {} },
        { id: 'a', name: 'Alpha', satisfiable: true, selectors: {} },
      ],
    });
    const result = await resolveSceneActions('place-1');
    expect(result.actions[0].name).toBe('Alpha');
    expect(result.actions[1].name).toBe('Zulu');
  });

  it('throws if no templates returned', async () => {
    mockListTemplates.mockResolvedValue({ sceneTemplates: [] });
    await expect(resolveSceneActions('place-1')).rejects.toThrow('No scene templates available');
  });

  it('throws if custom template not found', async () => {
    mockListTemplates.mockResolvedValue({
      sceneTemplates: [{ 'base:address': 'SERV:scenetmpl:home', 'base:id': 'home', 'scenetmpl:custom': false }],
    });
    await expect(resolveSceneActions('place-1')).rejects.toThrow('Custom scene template not found');
  });

  it('handles empty actions array', async () => {
    mockBridge.mockResolvedValue({ actions: [] });
    const result = await resolveSceneActions('place-1');
    expect(result.actions).toEqual([]);
  });

  it('handles missing actions in response', async () => {
    mockBridge.mockResolvedValue({});
    const result = await resolveSceneActions('place-1');
    expect(result.actions).toEqual([]);
  });

  it('transforms GROUP selector tuples into options with sub-selectors', async () => {
    mockBridge.mockResolvedValue({
      actions: [{
        id: 'switches', name: 'Lights', satisfiable: true,
        selectors: {
          'DRIV:dev:a': [
            {
              type: 'GROUP', name: 'switch',
              value: [
                ['ON', [{ type: 'PERCENT', name: 'brightness', min: 0, max: 100 }]],
                ['OFF', []],
              ],
            },
          ],
        },
      }],
    });
    const result = await resolveSceneActions('place-1');
    const sel = result.actions[0].selectors['DRIV:dev:a'][0];
    expect(sel.type).toBe('GROUP');
    expect(sel.options).toEqual([
      {
        label: 'ON', value: 'ON',
        selectors: [{ type: 'PERCENT', name: 'brightness', min: 0, max: 100 }],
      },
      { label: 'OFF', value: 'OFF', selectors: [] },
    ]);
  });

  it('transforms LIST selector tuples into options', async () => {
    mockBridge.mockResolvedValue({
      actions: [{
        id: 'fans', name: 'Fans', satisfiable: true,
        selectors: {
          'DRIV:dev:b': [
            { type: 'LIST', name: 'fanspeed', value: [['Low', 'LOW'], ['High', 'HIGH']] },
          ],
        },
      }],
    });
    const result = await resolveSceneActions('place-1');
    const sel = result.actions[0].selectors['DRIV:dev:b'][0];
    expect(sel.type).toBe('LIST');
    expect(sel.options).toEqual([
      { label: 'Low', value: 'LOW' },
      { label: 'High', value: 'HIGH' },
    ]);
  });

  it('passes through non-tuple selectors (PERCENT, RANGE, etc.) as value', async () => {
    mockBridge.mockResolvedValue({
      actions: [{
        id: 'dimmer', name: 'Dimmer', satisfiable: true,
        selectors: {
          'DRIV:dev:c': [
            { type: 'PERCENT', name: 'brightness', min: 0, max: 100, step: 1, value: 50 },
          ],
        },
      }],
    });
    const result = await resolveSceneActions('place-1');
    const sel = result.actions[0].selectors['DRIV:dev:c'][0];
    expect(sel.type).toBe('PERCENT');
    expect(sel.min).toBe(0);
    expect(sel.max).toBe(100);
    expect(sel.step).toBe(1);
    expect(sel.value).toBe(50);
    expect(sel.options).toBeUndefined();
  });
});
