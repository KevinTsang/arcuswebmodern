/**
 * An in-browser fake of the Arcus platform.
 *
 * The web client talks to the platform over a browser WebSocket (Cornea) and,
 * for a few messages, a REST bridge. Neither is reachable in CI, so the E2E
 * suite replaces `window.WebSocket` with a stand-in served by this engine and
 * answers the REST bridge through `cy.intercept` (see commands.ts).
 *
 * The engine keeps a mutable entity store, implements the request handlers the
 * client exercises (and pushes the same `base:ValueChange` / `base:Added` /
 * `base:Deleted` events the real platform would), and records every request so
 * specs can assert on what the UI actually sent.
 */

import {
  AlarmIncident, AlarmSubsystem, Base, Device, Person, Place, Rule, RuleTemplate, Scene,
  SceneTemplate, SecuritySubsystem,
} from '../../../packages/arcus-core/src/capabilities/capabilities';
import { createFixture } from './fixtures';
import {
  PlatformFailure,
  type Attrs, type Handler, type HandlerContext, type Json, type LoggedRequest,
  type PlatformData, type RequestEnvelope, type ResponseEnvelope,
} from './types';

type AppWindow = Window & typeof globalThis;

/** Matches the `ReconnectingWebSocket.OPEN` constant the client checks. */
const WS_OPEN = 1;
const WS_CLOSED = 3;

interface QueuedEvent {
  source: string;
  type: string;
  attributes: Attrs;
}

interface InjectedFailure {
  failure: PlatformFailure;
  remaining: number;
}

// ── Fake WebSocket ────────────────────────────────────────────────────

export class MockSocket {
  readyState = 0;
  binaryType = 'blob';
  readonly url: string;
  private target: EventTarget;

  constructor(private win: AppWindow, private platform: MockPlatform, url: string) {
    this.url = url;
    this.target = new win.EventTarget();
    win.setTimeout(() => this.connect(), 0);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.target.addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.target.removeEventListener(type, listener);
  }

  dispatchEvent(event: Event): boolean {
    return this.target.dispatchEvent(event);
  }

  send(data: string): void {
    if (this.readyState !== WS_OPEN) return;
    this.platform.receive(this, JSON.parse(data) as RequestEnvelope);
  }

  close(code = 1000, reason = ''): void {
    if (this.readyState === WS_CLOSED) return;
    this.readyState = WS_CLOSED;
    this.platform.detach(this);
    this.win.setTimeout(() => this.emitClose(code, reason), 0);
  }

  /** Called by the platform to push a frame to the client. */
  deliver(envelope: ResponseEnvelope): void {
    if (this.readyState !== WS_OPEN) return;
    this.dispatchEvent(new this.win.MessageEvent('message', { data: JSON.stringify(envelope) }));
  }

  /** Called by the platform to drop the connection server-side. */
  serverClose(code: number, reason = ''): void {
    if (this.readyState === WS_CLOSED) return;
    this.readyState = WS_CLOSED;
    this.platform.detach(this);
    this.emitClose(code, reason);
  }

  private emitClose(code: number, reason: string): void {
    this.dispatchEvent(
      new this.win.CloseEvent('close', { code, reason, wasClean: code === 1000 }),
    );
  }

  private connect(): void {
    if (this.readyState !== 0) return;
    if (!this.platform.acceptsConnection()) {
      // A rejected upgrade surfaces as `error` followed by an abnormal `close`.
      this.readyState = WS_CLOSED;
      this.dispatchEvent(new this.win.Event('error'));
      this.emitClose(1006, 'handshake rejected');
      return;
    }
    this.readyState = WS_OPEN;
    this.platform.attach(this);
    this.dispatchEvent(new this.win.Event('open'));
    this.win.setTimeout(() => this.platform.sendSessionCreated(this), 0);
  }
}

// ── Engine ────────────────────────────────────────────────────────────

export class MockPlatform {
  /** True while the browser holds a valid `irisAuthToken` session. */
  authenticated = false;
  data: PlatformData = createFixture();
  requests: LoggedRequest[] = [];

  private sockets = new Set<MockSocket>();
  private queued: QueuedEvent[] = [];
  private overrides = new Map<string, Handler>();
  private failures = new Map<string, InjectedFailure>();
  private created = 0;

  /** Restore pristine state; called before every test. */
  reset(): void {
    for (const socket of [...this.sockets]) socket.serverClose(1000);
    this.authenticated = false;
    this.data = createFixture();
    this.requests = [];
    this.sockets.clear();
    this.queued = [];
    this.overrides.clear();
    this.failures.clear();
    this.created = 0;
  }

  // ── Browser plumbing ────────────────────────────────────────────────

  /** Replace the app window's WebSocket with one backed by this engine. */
  install(win: AppWindow): void {
    const platform = this;
    class InstalledSocket extends MockSocket {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;
      readonly CONNECTING = 0;
      readonly OPEN = 1;
      readonly CLOSING = 2;
      readonly CLOSED = 3;
      constructor(url: string | URL) {
        super(win, platform, String(url));
      }
    }
    (win as unknown as { WebSocket: typeof InstalledSocket }).WebSocket = InstalledSocket;
  }

  acceptsConnection(): boolean {
    return this.authenticated;
  }

  attach(socket: MockSocket): void {
    this.sockets.add(socket);
  }

  detach(socket: MockSocket): void {
    this.sockets.delete(socket);
  }

  get openSocketCount(): number {
    return this.sockets.size;
  }

  sendSessionCreated(socket: MockSocket): void {
    socket.deliver({
      type: 'SessionCreated',
      headers: { isRequest: false },
      payload: {
        messageType: 'SessionCreated',
        attributes: {
          personId: this.data.personId,
          places: this.data.places.map((p) => ({ ...p })),
        },
      },
    });
  }

  /** Handle a request received over a WebSocket. */
  receive(socket: MockSocket, request: RequestEnvelope): void {
    const response = this.process(request, 'ws');
    socket.deliver(response);
    this.flushEvents();
  }

  /** Handle a request received over the REST bridge; returns the JSON body. */
  restRequest(request: RequestEnvelope): ResponseEnvelope {
    const response = this.process(request, 'rest');
    this.flushEvents();
    return response;
  }

  // ── Server-initiated behaviour ──────────────────────────────────────

  /** Push an event frame to every connected client. */
  emit(source: string, type: string, attributes: Attrs = {}): void {
    this.queued.push({ source, type, attributes });
    this.flushEvents();
  }

  /** Simulate the platform ending the session while the socket stays healthy. */
  expireSession(): void {
    this.authenticated = false;
    this.emit('SERV:sess:', 'sess:SessionExpired', {});
  }

  /** Simulate the platform closing every socket with the given close code. */
  dropConnections(code: number): void {
    for (const socket of [...this.sockets]) socket.serverClose(code);
  }

  /** Make the next `times` requests of `type` fail with a platform error. */
  failRequest(type: string, code = 'error.test', message = 'Simulated failure', times = 1): void {
    this.failures.set(type, { failure: new PlatformFailure(code, message), remaining: times });
  }

  /** Replace the default handler for a message type. */
  onRequest(type: string, handler: Handler): void {
    this.overrides.set(type, handler);
  }

  requestsOf(type: string): LoggedRequest[] {
    return this.requests.filter((r) => r.type === type);
  }

  // ── Entity store ────────────────────────────────────────────────────

  entity(address: string): Attrs | undefined {
    return this.data.entities[address];
  }

  /** Merge attributes into an entity and push `base:ValueChange`. */
  updateEntity(address: string, changes: Attrs): void {
    const current = this.data.entities[address];
    if (!current) throw new Error(`Unknown entity ${address}`);
    Object.assign(current, changes);
    this.queued.push({ source: address, type: Base.EVENT_VALUECHANGE, attributes: changes });
    this.flushEvents();
  }

  addEntity(entity: Attrs): void {
    const address = entity[Base.ATTR_ADDRESS] as string;
    this.data.entities[address] = entity;
    this.queued.push({ source: address, type: Base.EVENT_ADDED, attributes: entity });
    this.flushEvents();
  }

  removeEntity(address: string): void {
    delete this.data.entities[address];
    this.queued.push({ source: address, type: Base.EVENT_DELETED, attributes: {} });
    this.flushEvents();
  }

  /** Entities whose address is `<prefix>:<namespace>:…`. */
  entitiesIn(prefix: string, namespace: string, matchPrefix = false): Attrs[] {
    return Object.values(this.data.entities).filter((entity) => {
      const parts = (entity[Base.ATTR_ADDRESS] as string).split(':');
      if (parts[0] !== prefix) return false;
      return matchPrefix ? parts[1].startsWith(namespace) : parts[1] === namespace;
    });
  }

  // ── Request processing ──────────────────────────────────────────────

  private process(request: RequestEnvelope, transport: 'ws' | 'rest'): ResponseEnvelope {
    const type = request.type;
    const destination = request.headers.destination;
    const attrs = request.payload?.attributes ?? {};
    this.requests.push({ type, destination, attributes: attrs, transport });

    const correlationId = request.headers.correlationId;
    try {
      const injected = this.failures.get(type);
      if (injected && injected.remaining > 0) {
        injected.remaining -= 1;
        throw injected.failure;
      }
      const handler = this.overrides.get(type) ?? this.handlers[type];
      const context: HandlerContext = { type, destination, attrs };
      const result = handler ? handler(context) : undefined;
      return this.response(type, destination, correlationId, result ?? {});
    } catch (error) {
      if (error instanceof PlatformFailure) {
        return {
          type: 'Error',
          headers: { isRequest: false, correlationId, destination },
          payload: {
            messageType: 'Error',
            code: error.code,
            attributes: { code: error.code, message: error.message },
          },
        };
      }
      throw error;
    }
  }

  private response(
    type: string,
    destination: string,
    correlationId: string | undefined,
    attributes: Attrs,
  ): ResponseEnvelope {
    const responseType = `${type}Response`;
    const hasSource = destination.split(':').length >= 3;
    return {
      type: responseType,
      headers: {
        isRequest: false,
        correlationId,
        ...(hasSource ? { source: destination } : {}),
      },
      payload: { messageType: responseType, attributes },
    };
  }

  private flushEvents(): void {
    const events = this.queued;
    this.queued = [];
    for (const event of events) {
      const envelope: ResponseEnvelope = {
        type: event.type,
        headers: { isRequest: false, source: event.source },
        payload: { messageType: event.type, attributes: event.attributes },
      };
      for (const socket of this.sockets) socket.deliver(envelope);
    }
  }

  private queue(source: string, type: string, attributes: Attrs): void {
    this.queued.push({ source, type, attributes });
  }

  private nextId(prefix: string): string {
    this.created += 1;
    return `${prefix}-new-${this.created}`;
  }

  private mustGet(address: string): Attrs {
    const entity = this.data.entities[address];
    if (!entity) throw new PlatformFailure('error.notfound', `No such object ${address}`);
    return entity;
  }

  // ── Default handlers ────────────────────────────────────────────────

  private handlers: { [type: string]: Handler } = {
    // Session
    'sess:SetActivePlace': ({ attrs }) => {
      this.data.placeId = attrs.placeId as string;
      return {};
    },
    'sess:ListAvailablePlaces': () => ({
      places: this.data.places.map((p) => ({
        placeId: p.placeId,
        name: p.placeName,
        role: p.role,
      })),
    }),
    'sess:GetPreferences': () => ({ prefs: this.data.preferences }),
    'sess:SetPreferences': ({ attrs }) => {
      this.data.preferences = { ...this.data.preferences, ...(attrs.prefs as Attrs) };
      return {};
    },
    'sess:ResetPreference': ({ attrs }) => {
      delete this.data.preferences[attrs.prefKey as string];
      return {};
    },
    'sess:Log': () => ({}),
    'sess:Tag': () => ({}),

    // Generic object protocol
    [Base.CMD_GETATTRIBUTES]: ({ destination }) => ({ ...this.mustGet(destination) }),
    [Base.CMD_SETATTRIBUTES]: ({ destination, attrs }) => {
      this.mustGet(destination);
      this.updateEntity(destination, attrs);
      return {};
    },
    [Base.CMD_ADDTAGS]: ({ destination, attrs }) => {
      const entity = this.mustGet(destination);
      const tags = new Set((entity[Base.ATTR_TAGS] as string[] | undefined) ?? []);
      for (const tag of attrs.tags as string[]) tags.add(tag);
      this.updateEntity(destination, { [Base.ATTR_TAGS]: [...tags] });
      return {};
    },
    [Base.CMD_REMOVETAGS]: ({ destination, attrs }) => {
      const entity = this.mustGet(destination);
      const remove = new Set(attrs.tags as string[]);
      const tags = ((entity[Base.ATTR_TAGS] as string[] | undefined) ?? []).filter((t) => !remove.has(t));
      this.updateEntity(destination, { [Base.ATTR_TAGS]: tags });
      return {};
    },

    // Place
    [Place.CMD_LISTDEVICES]: () => ({ devices: this.entitiesIn('DRIV', 'dev') }),
    [Place.CMD_LISTPERSONS]: () => ({ persons: this.entitiesIn('SERV', 'person') }),
    [Place.CMD_GETHUB]: () => {
      const hubs = this.entitiesIn('SERV', 'hub', false).concat(
        Object.values(this.data.entities).filter((e) => e[Base.ATTR_TYPE] === 'hub'),
      );
      return { hub: hubs[0] ?? {} };
    },
    [Place.CMD_LISTDASHBOARDENTRIES]: ({ attrs }) => ({
      results: this.data.history.slice(0, (attrs.limit as number | undefined) ?? 5),
    }),
    [Place.CMD_LISTHISTORYENTRIES]: ({ attrs }) => ({
      results: this.data.history.slice(0, (attrs.limit as number | undefined) ?? 20),
    }),
    [Person.CMD_PENDINGINVITATIONS]: () => ({ invitations: this.data.invitations }),

    // Lists loaded when a place becomes active
    'subs:ListSubsystems': () => ({ subsystems: this.entitiesIn('SERV', 'sub', true) }),
    'scheduler:ListSchedulers': () => ({ schedulers: this.entitiesIn('SERV', 'scheduler') }),
    'scene:ListScenes': () => ({ scenes: this.entitiesIn('SERV', 'scene') }),
    'scene:ListSceneTemplates': () => ({
      sceneTemplates: [
        {
          [Base.ATTR_ADDRESS]: 'SERV:scenetmpl:custom',
          [Base.ATTR_ID]: 'custom',
          [SceneTemplate.ATTR_CUSTOM]: true,
          [SceneTemplate.ATTR_NAME]: 'Custom',
        },
      ],
    }),
    [SceneTemplate.CMD_RESOLVEACTIONS]: () => ({ actions: this.data.sceneActions as Json }),
    'rule:ListRules': () => ({ rules: this.entitiesIn('SERV', 'rule') }),
    'rule:ListRuleTemplates': () => ({ ruleTemplates: this.entitiesIn('SERV', 'ruletmpl') }),
    'prodcat:GetProducts': () => ({ products: this.data.products }),
    'prodcat:GetProduct': ({ attrs }) => {
      const product = this.data.products.find((p) => p['product:id'] === attrs.id);
      return product ? { product } : {};
    },
    'prodcat:GetBrands': () => ({
      brands: [...new Set(this.data.products.map((p) => p['product:vendor'] as string))].map((name) => ({
        name,
      })),
    }),

    // Scenes
    [Scene.CMD_FIRE]: ({ destination }) => {
      this.mustGet(destination);
      return {};
    },
    [Scene.CMD_DELETE]: ({ destination }) => {
      this.mustGet(destination);
      delete this.data.entities[destination];
      this.queue(destination, Base.EVENT_DELETED, {});
      return {};
    },
    [SceneTemplate.CMD_CREATE]: ({ attrs }) => {
      const id = this.nextId('scene');
      const address = `SERV:scene:${this.data.placeId}.${id}`;
      const scene: Attrs = {
        [Base.ATTR_ADDRESS]: address,
        [Base.ATTR_ID]: id,
        [Base.ATTR_TYPE]: 'scene',
        [Scene.ATTR_NAME]: attrs.name as string,
        [Scene.ATTR_ENABLED]: true,
        [Scene.ATTR_NOTIFICATION]: false,
        [Scene.ATTR_TEMPLATE]: 'custom',
        [Scene.ATTR_ACTIONS]: attrs.actions as Json,
      };
      this.data.entities[address] = scene;
      this.queue(address, Base.EVENT_ADDED, scene);
      return { scene };
    },

    // Rules
    [Rule.CMD_ENABLE]: ({ destination }) => {
      this.mustGet(destination);
      this.updateEntity(destination, { [Rule.ATTR_STATE]: Rule.STATE_ENABLED });
      return {};
    },
    [Rule.CMD_DISABLE]: ({ destination }) => {
      this.mustGet(destination);
      this.updateEntity(destination, { [Rule.ATTR_STATE]: Rule.STATE_DISABLED });
      return {};
    },
    [Rule.CMD_DELETE]: ({ destination }) => {
      this.mustGet(destination);
      delete this.data.entities[destination];
      this.queue(destination, Base.EVENT_DELETED, {});
      return {};
    },
    [Rule.CMD_UPDATECONTEXT]: ({ destination, attrs }) => {
      this.mustGet(destination);
      this.updateEntity(destination, { [Rule.ATTR_CONTEXT]: attrs.context as Json });
      return {};
    },
    [RuleTemplate.CMD_RESOLVE]: ({ destination }) => ({
      ...(this.data.ruleSelectors[destination] ?? {}),
    }),
    [RuleTemplate.CMD_CREATERULE]: ({ destination, attrs }) => {
      const template = this.mustGet(destination);
      const id = this.nextId('rule');
      const address = `SERV:rule:${this.data.placeId}.${id}`;
      const rule: Attrs = {
        [Base.ATTR_ADDRESS]: address,
        [Base.ATTR_ID]: id,
        [Base.ATTR_TYPE]: 'rule',
        [Rule.ATTR_NAME]: attrs.name as string,
        [Rule.ATTR_DESCRIPTION]: attrs.description as string,
        [Rule.ATTR_STATE]: Rule.STATE_ENABLED,
        [Rule.ATTR_TEMPLATE]: template[Base.ATTR_ID] as string,
        [Rule.ATTR_CONTEXT]: attrs.context as Json,
      };
      this.data.entities[address] = rule;
      this.queue(address, Base.EVENT_ADDED, rule);
      return { rule };
    },

    // Devices
    [Device.CMD_REMOVE]: ({ destination }) => {
      this.mustGet(destination);
      delete this.data.entities[destination];
      this.queue(destination, Base.EVENT_DELETED, {});
      return {};
    },

    // Alarm
    [AlarmSubsystem.CMD_LISTINCIDENTS]: () => ({
      incidents: this.entitiesIn('SERV', 'incident'),
    }),
    [SecuritySubsystem.CMD_ARM]: ({ destination, attrs }) => {
      this.mustGet(destination);
      this.updateEntity(destination, {
        [SecuritySubsystem.ATTR_ALARMMODE]: attrs.mode as string,
        [SecuritySubsystem.ATTR_ALARMSTATE]: SecuritySubsystem.ALARMSTATE_ARMED,
      });
      return {};
    },
    [SecuritySubsystem.CMD_DISARM]: ({ destination }) => {
      this.mustGet(destination);
      this.updateEntity(destination, {
        [SecuritySubsystem.ATTR_ALARMMODE]: SecuritySubsystem.ALARMMODE_OFF,
        [SecuritySubsystem.ATTR_ALARMSTATE]: SecuritySubsystem.ALARMSTATE_DISARMED,
      });
      return {};
    },
    [AlarmIncident.CMD_CANCEL]: () => ({}),
  };
}
