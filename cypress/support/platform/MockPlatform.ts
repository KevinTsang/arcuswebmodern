/**
 * An in-browser fake of the Arcus platform.
 *
 * The web client talks to the platform over a browser WebSocket (Cornea) and,
 * for a few messages, a REST bridge. Neither is reachable in CI, so the E2E
 * suite replaces `window.WebSocket` with a stand-in served by this engine and
 * answers the REST bridge through `cy.intercept` (see ../commands.ts).
 *
 * The engine keeps a mutable entity store, implements the request handlers the
 * client exercises (pushing the same `base:ValueChange` / `base:Added` /
 * `base:Deleted` events the real platform would), records every request so
 * specs can assert on what the UI actually sent, and tracks every object a
 * test creates so `cleanupCreated()` can remove the leftovers afterwards.
 */

import {
  Account, AlarmIncident, AlarmSubsystem, Base, Device, Hub, HubZwave, MotorizedDoor, PairingDevice,
  PairingSubsystem, Person, Place, Rule, RuleTemplate, Scene, SceneTemplate, Scheduler,
  SecuritySubsystem,
} from '../../../packages/arcus-core/src/capabilities/capabilities';
import { createFixture, PLACE_ID } from './fixtures';
import {
  PlatformFailure,
  type ApiKeyFixture, type Attrs, type Handler, type HandlerContext, type InvitationFixture,
  type Json, type LoggedRequest, type PlatformData, type RequestEnvelope, type ResponseEnvelope,
} from './types';

type AppWindow = Window & typeof globalThis;

const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSED = 3;

/** The platform socket path; every other WebSocket (Next.js HMR) is passed through. */
const PLATFORM_SOCKET_PATH = '/websocket';

interface InjectedFailure {
  failure: PlatformFailure;
  remaining: number;
}

export interface RestResult {
  status: number;
  body: ResponseEnvelope;
}

// ── Fake WebSocket ────────────────────────────────────────────────────

export class MockSocket {
  readyState = WS_CONNECTING;
  binaryType = 'blob';
  readonly url: string;
  readonly protocol = '';
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

  /** Client-initiated close: the close event arrives asynchronously, like a real socket. */
  close(code = 1000, reason = ''): void {
    if (this.readyState === WS_CLOSED) return;
    this.readyState = WS_CLOSED;
    this.platform.detach(this);
    this.win.setTimeout(() => this.emitClose(code, reason), 0);
  }

  /** Push a frame to the client (asynchronously, like network delivery). */
  deliver(envelope: ResponseEnvelope): void {
    if (this.readyState !== WS_OPEN) return;
    const data = JSON.stringify(envelope);
    this.win.setTimeout(() => {
      if (this.readyState !== WS_OPEN) return;
      this.dispatchEvent(new this.win.MessageEvent('message', { data }));
    }, 0);
  }

  /** Server-initiated close with the given code. */
  serverClose(code: number, reason = ''): void {
    if (this.readyState === WS_CLOSED) return;
    this.readyState = WS_CLOSED;
    this.platform.detach(this);
    this.emitClose(code, reason);
  }

  /** Silently discard the connection (no events) — used between tests. */
  kill(): void {
    this.readyState = WS_CLOSED;
  }

  private emitClose(code: number, reason: string): void {
    this.dispatchEvent(new this.win.CloseEvent('close', { code, reason, wasClean: code === 1000 }));
  }

  private connect(): void {
    if (this.readyState !== WS_CONNECTING) return;
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
    this.platform.sendSessionCreated(this);
  }
}

// ── Engine ────────────────────────────────────────────────────────────

export class MockPlatform {
  /** True while the browser holds a valid platform session (the `irisAuthToken` cookie). */
  authenticated = false;
  data: PlatformData = createFixture();
  requests: LoggedRequest[] = [];
  /** Addresses of objects created during the current test, removed by `cleanupCreated()`. */
  created = new Set<string>();

  private sockets = new Set<MockSocket>();
  private overrides = new Map<string, Handler>();
  private failures = new Map<string, InjectedFailure>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private counter = 0;

  /** Restore pristine state; called before every test. */
  reset(): void {
    for (const socket of this.sockets) socket.kill();
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
    this.authenticated = false;
    this.data = createFixture();
    this.requests = [];
    this.created.clear();
    this.sockets.clear();
    this.overrides.clear();
    this.failures.clear();
    this.counter = 0;
  }

  // ── Browser plumbing ────────────────────────────────────────────────

  /** Route the app window's platform WebSocket to this engine (other sockets pass through). */
  install(win: AppWindow): void {
    const platform = this;
    const NativeWebSocket = win.WebSocket;

    function RoutedWebSocket(this: unknown, url: string | URL, protocols?: string | string[]) {
      const href = String(url);
      if (href.includes(PLATFORM_SOCKET_PATH)) {
        return new MockSocket(win, platform, href);
      }
      return protocols ? new NativeWebSocket(href, protocols) : new NativeWebSocket(href);
    }
    RoutedWebSocket.CONNECTING = 0;
    RoutedWebSocket.OPEN = 1;
    RoutedWebSocket.CLOSING = 2;
    RoutedWebSocket.CLOSED = 3;
    RoutedWebSocket.prototype = NativeWebSocket.prototype;

    (win as unknown as { WebSocket: unknown }).WebSocket = RoutedWebSocket;
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

  /** The `SessionCreated` handshake frame: the person plus the places they can access. */
  sendSessionCreated(socket: MockSocket): void {
    const person = this.data.entities[`SERV:person:${this.data.personId}`] ?? {};
    socket.deliver({
      type: 'SessionCreated',
      headers: { isRequest: false },
      payload: {
        messageType: 'SessionCreated',
        attributes: {
          ...person,
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
  }

  /**
   * Handle a request received over the REST bridge. The bridge expects a JSON
   * envelope on 2xx and `payload.attributes` describing the error otherwise.
   */
  restRequest(request: RequestEnvelope): RestResult {
    const body = this.process(request, 'rest');
    return { status: body.type === 'Error' ? 400 : 200, body };
  }

  /** `POST /login` — the only credentials the platform knows are the fixture's. */
  login(user: string, password: string): boolean {
    const ok = user === this.data.login.email && password === this.data.login.password;
    this.authenticated = ok;
    return ok;
  }

  /** `POST /logout`. */
  logout(): void {
    this.authenticated = false;
  }

  // ── Server-initiated behaviour ──────────────────────────────────────

  /** Push an event frame from `source` to every connected client. */
  emit(source: string | undefined, type: string, attributes: Attrs = {}): void {
    const envelope: ResponseEnvelope = {
      type,
      headers: { isRequest: false, ...(source ? { source } : {}) },
      payload: { messageType: type, attributes },
    };
    for (const socket of this.sockets) socket.deliver(envelope);
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

  lastRequestOf(type: string): LoggedRequest | undefined {
    const matches = this.requestsOf(type);
    return matches[matches.length - 1];
  }

  /** Run `fn` after `ms` milliseconds; cancelled by `reset()`. */
  later(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  // ── Entity store ────────────────────────────────────────────────────

  entity(address: string): Attrs | undefined {
    return this.data.entities[address];
  }

  /** Merge attributes into an entity and push `base:ValueChange`. */
  updateEntity(address: string, changes: Attrs): void {
    const current = this.mustGet(address);
    Object.assign(current, changes);
    this.emit(address, Base.EVENT_VALUECHANGE, changes);
  }

  /** Add an entity and push `base:Added`. Tracked for cleanup unless `track` is false. */
  addEntity(entity: Attrs, track = true): void {
    const address = entity[Base.ATTR_ADDRESS] as string;
    this.data.entities[address] = entity;
    if (track) this.created.add(address);
    this.emit(address, Base.EVENT_ADDED, entity);
  }

  /** Remove an entity and push `base:Deleted`. */
  removeEntity(address: string): void {
    if (!this.data.entities[address]) return;
    delete this.data.entities[address];
    this.created.delete(address);
    this.emit(address, Base.EVENT_DELETED, {});
  }

  /** Entities whose address is `<prefix>:<namespace>:…` (or `<namespace>*` with matchPrefix). */
  entitiesIn(prefix: string, namespace: string, matchPrefix = false): Attrs[] {
    return Object.values(this.data.entities).filter((entity) => {
      const parts = (entity[Base.ATTR_ADDRESS] as string).split(':');
      if (parts[0] !== prefix) return false;
      return matchPrefix ? parts[1].startsWith(namespace) : parts[1] === namespace;
    });
  }

  /**
   * Remove everything a test created and left behind: entities (scenes, rules,
   * places, devices, pairing records, …) plus non-entity records (API keys,
   * invitations, scheduler commands). Returns a description of what was removed.
   */
  cleanupCreated(): string[] {
    const removed: string[] = [];
    for (const key of [...this.created]) {
      // `<scheduler address>#<command id>` marks a command added to an existing scheduler.
      const [address, commandId] = key.split('#');
      if (commandId && this.data.entities[address]) {
        const commands = { ...(this.data.entities[address][Scheduler.ATTR_COMMANDS] as Attrs) };
        delete commands[commandId];
        this.updateEntity(address, { [Scheduler.ATTR_COMMANDS]: commands });
        removed.push(key);
      } else if (this.data.entities[address]) {
        if (this.data.entities[address][Base.ATTR_TYPE] === 'place') {
          const placeId = this.data.entities[address][Base.ATTR_ID];
          this.data.places = this.data.places.filter((p) => p.placeId !== placeId);
        }
        this.removeEntity(address);
        removed.push(address);
      }
      this.created.delete(key);
    }
    const leftoverKeys = this.data.apiKeys.filter((k) => k.id.startsWith('key-new-'));
    if (leftoverKeys.length) {
      this.data.apiKeys = this.data.apiKeys.filter((k) => !k.id.startsWith('key-new-'));
      removed.push(...leftoverKeys.map((k) => `apikey:${k.id}`));
    }
    const leftoverInvites = Object.keys(this.data.invitationCodes).filter((c) => c.startsWith('NEW-'));
    for (const code of leftoverInvites) {
      delete this.data.invitationCodes[code];
      removed.push(`invitation:${code}`);
    }
    return removed;
  }

  // ── Request processing ──────────────────────────────────────────────

  private process(request: RequestEnvelope, transport: 'ws' | 'rest'): ResponseEnvelope {
    const type = request.type;
    const destination = request.headers?.destination ?? '';
    const attrs = request.payload?.attributes ?? {};
    this.requests.push({ type, destination, attributes: attrs, transport });

    const correlationId = request.headers?.correlationId;
    try {
      const injected = this.failures.get(type);
      if (injected && injected.remaining > 0) {
        injected.remaining -= 1;
        throw injected.failure;
      }
      const handler = this.overrides.get(type) ?? this.handlers[type];
      const context: HandlerContext = { type, destination, attrs };
      const result = handler ? handler(context) : undefined;
      const responseType = `${type}Response`;
      return {
        type: responseType,
        headers: { isRequest: false, correlationId },
        payload: { messageType: responseType, attributes: result ?? {} },
      };
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

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-new-${this.counter}`;
  }

  private mustGet(address: string): Attrs {
    const entity = this.data.entities[address];
    if (!entity) throw new PlatformFailure('error.notfound', `No such object ${address}`);
    return entity;
  }

  private placeAddress(): string {
    return `SERV:place:${this.data.placeId}`;
  }

  private pairingSubsystemAddress(): string {
    return `SERV:subpairing:${PLACE_ID}`;
  }

  private createPlace(placeAttrs: Attrs, role: string): Attrs {
    const id = this.nextId('place');
    const address = `SERV:place:${id}`;
    const place: Attrs = {
      [Base.ATTR_ADDRESS]: address,
      [Base.ATTR_ID]: id,
      [Base.ATTR_TYPE]: 'place',
      [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_BASIC,
      [Place.ATTR_ACCOUNT]: this.data.accountId,
      ...placeAttrs,
    };
    this.data.entities[address] = place;
    this.created.add(address);
    this.data.places.push({
      placeId: id,
      placeName: (place[Place.ATTR_NAME] as string) ?? 'New Place',
      accountId: this.data.accountId,
      role,
    });
    return place;
  }

  // ── Default handlers ────────────────────────────────────────────────

  private handlers: { [type: string]: Handler } = {
    // Session
    'sess:SetActivePlace': ({ attrs }) => {
      this.data.placeId = attrs.placeId as string;
      return {};
    },
    'sess:ListAvailablePlaces': () => ({
      places: this.data.places.map((p) => ({ placeId: p.placeId, name: p.placeName, role: p.role })),
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
      this.updateEntity(destination, attrs);
      // Renaming a place also renames it in the session's place list.
      if (typeof attrs[Place.ATTR_NAME] === 'string' && destination.startsWith('SERV:place:')) {
        const placeId = destination.slice('SERV:place:'.length);
        for (const p of this.data.places) if (p.placeId === placeId) p.placeName = attrs[Place.ATTR_NAME] as string;
      }
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
    [Place.CMD_GETHUB]: () => ({
      hub: Object.values(this.data.entities).find((e) => e[Base.ATTR_TYPE] === 'hub') ?? {},
    }),
    [Place.CMD_LISTDASHBOARDENTRIES]: ({ attrs }) => ({
      results: this.data.history.slice(0, (attrs.limit as number | undefined) ?? 5) as unknown as Json,
    }),
    [Place.CMD_LISTHISTORYENTRIES]: ({ destination, attrs }) => {
      // Like the real platform, a place capability command is only valid on a place.
      if (!destination.startsWith('SERV:place:')) {
        throw new PlatformFailure('error.unsupported', `${Place.CMD_LISTHISTORYENTRIES} is not supported by ${destination}`);
      }
      return { results: this.data.history.slice(0, (attrs.limit as number | undefined) ?? 20) as unknown as Json };
    },
    [Device.CMD_LISTHISTORYENTRIES]: ({ destination, attrs }) => ({
      results: this.data.history
        .filter((h) => h.subjectAddress === destination)
        .slice(0, (attrs.limit as number | undefined) ?? 20) as unknown as Json,
    }),
    [Place.CMD_CREATEINVITATION]: ({ attrs }) => {
      const code = `NEW-${this.nextId('INVITE').toUpperCase()}`;
      const place = this.mustGet(this.placeAddress());
      const invitation: InvitationFixture = {
        code,
        placeId: this.data.placeId,
        placeName: (place[Place.ATTR_NAME] as string) ?? 'Place',
        inviteeEmail: attrs.email as string,
        inviteeFirstName: (attrs.firstName as string) ?? '',
        inviteeLastName: (attrs.lastName as string) ?? '',
        invitorFirstName: 'Alex',
        invitorLastName: 'Rivera',
      };
      this.data.invitationCodes[code] = invitation;
      return { invitation: invitation as unknown as Json };
    },
    [Place.CMD_SENDINVITATION]: () => ({}),
    [Place.CMD_REGISTERHUBV2]: ({ attrs }) => {
      const hubId = (attrs.hubId as string) ?? '';
      if (!/^[A-Z]{3}-\d{4}$/.test(hubId)) {
        return { state: 'request.param.invalid', progress: 0 };
      }
      if (hubId === 'ZZZ-0000') {
        return { state: 'error.register.alreadyregistered', progress: 0 };
      }
      const existing = Object.values(this.data.entities).find((e) => e[Base.ATTR_TYPE] === 'hub');
      if (existing) return { state: 'REGISTERED', progress: 100, hub: existing };
      const address = `SERV:${hubId}:hub`;
      const hub: Attrs = {
        [Base.ATTR_ADDRESS]: address,
        [Base.ATTR_ID]: hubId,
        [Base.ATTR_TYPE]: 'hub',
        [Hub.ATTR_ID]: hubId,
        [Hub.ATTR_NAME]: 'New Hub',
        [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
        [Hub.ATTR_REGISTRATIONSTATE]: Hub.REGISTRATIONSTATE_REGISTERED,
        [Hub.ATTR_MODEL]: 'IH300',
        [Hub.ATTR_VENDOR]: 'Arcus',
        [HubZwave.ATTR_NUMDEVICES]: 0,
      };
      this.data.entities[address] = hub;
      this.created.add(address);
      return { state: 'REGISTERED', progress: 100, hub };
    },

    // Person
    [Person.CMD_PENDINGINVITATIONS]: () => ({ invitations: this.data.invitations as unknown as Json }),
    [Person.CMD_ACCEPTINVITATION]: ({ attrs }) => {
      const code = attrs.code as string;
      const invitation = this.data.invitations.find((i) => i.code === code);
      if (!invitation) throw new PlatformFailure('error.notfound', 'Unknown invitation');
      this.data.invitations = this.data.invitations.filter((i) => i.code !== code);
      this.data.places.push({
        placeId: invitation.placeId,
        placeName: invitation.placeName,
        accountId: 'account-other',
        role: 'FULL_ACCESS',
      });
      return {};
    },
    [Person.CMD_REJECTINVITATION]: ({ attrs }) => {
      this.data.invitations = this.data.invitations.filter((i) => i.code !== attrs.code);
      return {};
    },
    [Person.CMD_REMOVEFROMPLACE]: ({ destination }) => {
      this.mustGet(destination);
      this.removeEntity(destination);
      return {};
    },
    [Person.CMD_VERIFYPIN]: ({ attrs }) => {
      if (attrs.pin !== '1234') throw new PlatformFailure('error.pin.invalid', 'Invalid PIN');
      return { success: true };
    },
    [Person.CMD_CHANGEPINV2]: ({ attrs }) => {
      if (!/^\d{4,8}$/.test(String(attrs.pin ?? ''))) {
        throw new PlatformFailure('error.pin.invalid', 'PIN must be 4-8 digits');
      }
      return { success: true };
    },
    'person:ChangePassword': ({ attrs }) => {
      if (attrs.currentPassword !== this.data.login.password) {
        throw new PlatformFailure('error.password.invalid', 'Wrong password');
      }
      this.data.login.password = attrs.newPassword as string;
      return {};
    },
    'person:SendPasswordReset': () => ({}),
    'person:ResetPassword': ({ attrs }) => {
      if (attrs.token !== 'RESET-99') throw new PlatformFailure('error.token.invalid', 'Invalid reset code');
      this.data.login.password = attrs.password as string;
      return {};
    },

    // Account
    [Account.CMD_ADDPLACE]: ({ attrs }) => ({
      place: this.createPlace(attrs.place as Attrs, 'OWNER'),
    }),
    'account:CreateAccount': ({ attrs }) => {
      const personAttrs = (attrs.person as Attrs) ?? {};
      const personId = this.nextId('person');
      const personAddress = `SERV:person:${personId}`;
      const person: Attrs = {
        [Base.ATTR_ADDRESS]: personAddress,
        [Base.ATTR_ID]: personId,
        [Base.ATTR_TYPE]: 'person',
        [Person.ATTR_EMAIL]: attrs.email as string,
        ...personAttrs,
      };
      this.data.entities[personAddress] = person;
      this.created.add(personAddress);
      this.data.personId = personId;
      this.data.places = [];
      const place = this.createPlace({ [Place.ATTR_NAME]: 'My Home' }, 'OWNER');
      const placeId = place[Base.ATTR_ID] as string;
      this.data.placeId = placeId;
      this.data.login = { email: attrs.email as string, password: attrs.password as string };
      this.authenticated = true;
      return {
        placeId,
        account: { ...this.mustGet(`SERV:account:${this.data.accountId}`) },
        person,
      };
    },

    // Invitations (REST + WS)
    'invite:GetInvitation': ({ attrs }) => {
      const invitation = this.data.invitationCodes[attrs.code as string];
      if (!invitation || invitation.inviteeEmail !== attrs.inviteeEmail) {
        throw new PlatformFailure('error.notfound', 'Invitation not found');
      }
      return { invitation: invitation as unknown as Json };
    },
    'invite:AcceptInvitationCreateLogin': ({ attrs }) => {
      const invitation = this.data.invitationCodes[attrs.code as string];
      if (!invitation) throw new PlatformFailure('error.notfound', 'Invitation not found');
      const personAttrs = (attrs.person as Attrs) ?? {};
      const personId = this.nextId('person');
      const personAddress = `SERV:person:${personId}`;
      this.data.entities[personAddress] = {
        [Base.ATTR_ADDRESS]: personAddress,
        [Base.ATTR_ID]: personId,
        [Base.ATTR_TYPE]: 'person',
        ...personAttrs,
      };
      this.created.add(personAddress);
      this.data.personId = personId;
      const placeAddress = `SERV:place:${invitation.placeId}`;
      if (!this.data.entities[placeAddress]) {
        this.data.entities[placeAddress] = {
          [Base.ATTR_ADDRESS]: placeAddress,
          [Base.ATTR_ID]: invitation.placeId,
          [Base.ATTR_TYPE]: 'place',
          [Place.ATTR_NAME]: invitation.placeName,
          [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_BASIC,
          [Place.ATTR_ACCOUNT]: this.data.accountId,
        };
        this.created.add(placeAddress);
      }
      this.data.places = [{
        placeId: invitation.placeId,
        placeName: invitation.placeName,
        accountId: this.data.accountId,
        role: 'FULL_ACCESS',
      }];
      this.data.placeId = invitation.placeId;
      this.data.login = { email: invitation.inviteeEmail, password: attrs.password as string };
      return {};
    },

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
    [SceneTemplate.CMD_RESOLVEACTIONS]: () => ({ actions: this.data.sceneActions }),
    'rule:ListRules': () => ({ rules: this.entitiesIn('SERV', 'rule') }),
    'rule:ListRuleTemplates': () => ({ ruleTemplates: this.entitiesIn('SERV', 'ruletmpl') }),
    'prodcat:GetProducts': () => ({ products: this.data.products.filter((p) => p['product:canBrowse'] !== false) }),
    'prodcat:GetProduct': ({ attrs }) => {
      const product = this.data.products.find((p) => p['product:id'] === attrs.id);
      return product ? { product } : {};
    },
    'prodcat:GetBrands': () => {
      const counts = new Map<string, number>();
      for (const p of this.data.products) {
        if (p['product:canBrowse'] === false) continue;
        const vendor = p['product:vendor'] as string;
        counts.set(vendor, (counts.get(vendor) ?? 0) + 1);
      }
      return { brands: [...counts.entries()].map(([name, count]) => ({ name, count })) };
    },
    'prodcat:FindProducts': ({ attrs }) => {
      const term = String(attrs.search ?? '').toLowerCase();
      return {
        products: this.data.products.filter((p) =>
          p['product:canBrowse'] !== false
          && String(p['product:name']).toLowerCase().includes(term)
          || String(p['product:vendor']).toLowerCase().includes(term)),
      };
    },

    // Scenes
    [Scene.CMD_FIRE]: ({ destination }) => {
      this.mustGet(destination);
      return {};
    },
    [Scene.CMD_DELETE]: ({ destination }) => {
      this.mustGet(destination);
      this.removeEntity(destination);
      return {};
    },
    [SceneTemplate.CMD_CREATE]: ({ attrs }) => {
      const id = this.nextId('scene');
      const address = `SERV:scene:${this.data.placeId}.${id}`;
      const scene: Attrs = {
        [Base.ATTR_ADDRESS]: address,
        [Base.ATTR_ID]: id,
        [Base.ATTR_TYPE]: 'scene',
        [Base.ATTR_TAGS]: [],
        [Scene.ATTR_NAME]: attrs.name as string,
        [Scene.ATTR_ENABLED]: true,
        [Scene.ATTR_NOTIFICATION]: false,
        [Scene.ATTR_TEMPLATE]: 'custom',
        [Scene.ATTR_ACTIONS]: attrs.actions,
      };
      this.addEntity(scene);
      return { address };
    },

    // Schedules
    'scheduler:ScheduleWeeklyCommand': ({ attrs }) => {
      const target = attrs.target as string;
      let scheduler = Object.values(this.data.entities)
        .find((e) => e[Base.ATTR_TYPE] === 'scheduler' && e[Scheduler.ATTR_TARGET] === target);
      const commandId = this.nextId('cmd');
      const command: Attrs = {
        id: commandId,
        scheduleId: attrs.schedule,
        days: attrs.days,
        mode: attrs.mode,
        time: attrs.time,
        offsetMinutes: attrs.offsetMinutes,
        messageType: attrs.messageType,
        attributes: attrs.attributes ?? {},
      };
      if (!scheduler) {
        const id = this.nextId('sched');
        scheduler = {
          [Base.ATTR_ADDRESS]: `SERV:scheduler:${id}`,
          [Base.ATTR_ID]: id,
          [Base.ATTR_TYPE]: 'scheduler',
          [Scheduler.ATTR_TARGET]: target,
          [Scheduler.ATTR_PLACEID]: this.data.placeId,
          [Scheduler.ATTR_COMMANDS]: { [commandId]: command },
        };
        this.addEntity(scheduler);
      } else {
        const commands = { ...(scheduler[Scheduler.ATTR_COMMANDS] as Attrs), [commandId]: command };
        this.updateEntity(scheduler[Base.ATTR_ADDRESS] as string, { [Scheduler.ATTR_COMMANDS]: commands });
        this.created.add(`${scheduler[Base.ATTR_ADDRESS]}#${commandId}`);
      }
      return { commandId };
    },
    'scheduler:UpdateWeeklyCommand': ({ attrs }) => {
      const scheduler = this.schedulerFor(attrs.target as string);
      const commands = { ...(scheduler[Scheduler.ATTR_COMMANDS] as Attrs) };
      const commandId = attrs.commandId as string;
      commands[commandId] = {
        ...(commands[commandId] as Attrs),
        days: attrs.days,
        mode: attrs.mode,
        time: attrs.time,
        offsetMinutes: attrs.offsetMinutes,
        attributes: attrs.attributes ?? {},
      };
      this.updateEntity(scheduler[Base.ATTR_ADDRESS] as string, { [Scheduler.ATTR_COMMANDS]: commands });
      return {};
    },
    'scheduler:DeleteCommand': ({ attrs }) => {
      const scheduler = this.schedulerFor(attrs.target as string);
      const commands = { ...(scheduler[Scheduler.ATTR_COMMANDS] as Attrs) };
      delete commands[attrs.commandId as string];
      this.created.delete(`${scheduler[Base.ATTR_ADDRESS]}#${attrs.commandId}`);
      this.updateEntity(scheduler[Base.ATTR_ADDRESS] as string, { [Scheduler.ATTR_COMMANDS]: commands });
      return {};
    },

    // Rules
    [Rule.CMD_ENABLE]: ({ destination }) => {
      this.updateEntity(destination, { [Rule.ATTR_STATE]: Rule.STATE_ENABLED });
      return {};
    },
    [Rule.CMD_DISABLE]: ({ destination }) => {
      this.updateEntity(destination, { [Rule.ATTR_STATE]: Rule.STATE_DISABLED });
      return {};
    },
    [Rule.CMD_DELETE]: ({ destination }) => {
      this.mustGet(destination);
      this.removeEntity(destination);
      return {};
    },
    [Rule.CMD_UPDATECONTEXT]: ({ destination, attrs }) => {
      this.updateEntity(destination, { [Rule.ATTR_CONTEXT]: attrs.context });
      return {};
    },
    [RuleTemplate.CMD_RESOLVE]: ({ destination }) => ({ ...(this.data.ruleSelectors[destination] ?? {}) }),
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
        [Rule.ATTR_CONTEXT]: attrs.context,
      };
      this.addEntity(rule);
      return { address };
    },

    // Devices
    [Device.CMD_REMOVE]: ({ destination }) => {
      this.mustGet(destination);
      this.removeEntity(destination);
      return {};
    },
    [MotorizedDoor.CMD_OPENGARAGEDOOR]: ({ destination }) => {
      this.mustGet(destination);
      this.updateEntity(destination, {
        [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OPEN,
        [MotorizedDoor.ATTR_DOORLEVEL]: 100,
      });
      return {};
    },
    [MotorizedDoor.CMD_CLOSEGARAGEDOOR]: ({ destination }) => {
      this.mustGet(destination);
      this.updateEntity(destination, {
        [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_CLOSED,
        [MotorizedDoor.ATTR_DOORLEVEL]: 0,
      });
      return {};
    },
    'ident:Identify': ({ destination }) => {
      this.mustGet(destination);
      return {};
    },

    // Hub
    [HubZwave.CMD_HEAL]: ({ destination }) => {
      this.mustGet(destination);
      return {};
    },
    [Hub.CMD_UNPAIRINGREQUEST]: ({ destination, attrs }) => {
      const hub = this.mustGet(destination);
      const unpairing = attrs.actionType === 'START_UNPAIRING';
      this.updateEntity(destination, {
        [Hub.ATTR_STATE]: unpairing ? Hub.STATE_UNPAIRING : Hub.STATE_NORMAL,
      });
      void hub;
      return {};
    },

    // Alarm
    [AlarmSubsystem.CMD_LISTINCIDENTS]: () => ({ incidents: this.entitiesIn('SERV', 'incident') }),
    [SecuritySubsystem.CMD_ARM]: ({ destination, attrs }) => {
      this.updateEntity(destination, {
        [SecuritySubsystem.ATTR_ALARMMODE]: attrs.mode as string,
        [SecuritySubsystem.ATTR_ALARMSTATE]: SecuritySubsystem.ALARMSTATE_ARMED,
      });
      return {};
    },
    [SecuritySubsystem.CMD_DISARM]: ({ destination }) => {
      this.updateEntity(destination, {
        [SecuritySubsystem.ATTR_ALARMMODE]: SecuritySubsystem.ALARMMODE_OFF,
        [SecuritySubsystem.ATTR_ALARMSTATE]: SecuritySubsystem.ALARMSTATE_DISARMED,
      });
      return {};
    },
    [AlarmIncident.CMD_CANCEL]: ({ destination }) => {
      this.mustGet(destination);
      this.updateEntity(destination, { [AlarmIncident.ATTR_ALERTSTATE]: AlarmIncident.ALERTSTATE_COMPLETE });
      const security = `SERV:subsecurity:${PLACE_ID}`;
      if (this.data.entities[security]) {
        this.updateEntity(security, {
          [SecuritySubsystem.ATTR_ALARMSTATE]: SecuritySubsystem.ALARMSTATE_DISARMED,
          [SecuritySubsystem.ATTR_ALARMMODE]: SecuritySubsystem.ALARMMODE_OFF,
        });
      }
      return {};
    },

    // Care
    'subcare:Clear': ({ destination }) => {
      this.updateEntity(destination, { 'subcare:alarmState': 'READY' });
      return {};
    },

    // Pairing
    [PairingSubsystem.CMD_STARTPAIRING]: () => ({
      mode: 'HUB',
      steps: [
        { id: 'step-1', order: 1, instructions: ['Plug the device into a wall outlet.'] },
        { id: 'step-2', order: 2, instructions: ['Press the pairing button until the light blinks.'] },
      ],
    }),
    [PairingSubsystem.CMD_SEARCH]: ({ attrs }) => {
      const productAddress = (attrs.productAddress as string) ?? '';
      const product = this.data.products.find((p) => p[Base.ATTR_ADDRESS] === productAddress);
      const id = this.nextId('pairdev');
      const pairingAddress = `SERV:pairdev:${id}`;
      const pairing: Attrs = {
        [Base.ATTR_ADDRESS]: pairingAddress,
        [Base.ATTR_ID]: id,
        [Base.ATTR_TYPE]: 'pairdev',
        [PairingDevice.ATTR_PAIRINGSTATE]: PairingDevice.PAIRINGSTATE_PAIRING,
        [PairingDevice.ATTR_PAIRINGPHASE]: PairingDevice.PAIRINGPHASE_JOIN,
        [PairingDevice.ATTR_PRODUCTADDRESS]: productAddress,
        [PairingDevice.ATTR_PROTOCOLADDRESS]: `PROT:ZIGB:${id}`,
        [PairingDevice.ATTR_CUSTOMIZATIONS]: [],
      };
      this.data.entities[pairingAddress] = pairing;
      this.created.add(pairingAddress);
      // The device joins a moment later: a real device appears and the pairing record flips to PAIRED.
      this.later(1500, () => {
        const deviceId = this.nextId('dev');
        const deviceAddress = `DRIV:dev:${deviceId}`;
        this.addEntity({
          [Base.ATTR_ADDRESS]: deviceAddress,
          [Base.ATTR_ID]: deviceId,
          [Base.ATTR_TYPE]: 'dev',
          [Base.ATTR_CAPS]: ['base', 'dev', 'devadv', 'devconn', 'devpow', 'swit'],
          [Base.ATTR_TAGS]: [],
          [Device.ATTR_NAME]: (product?.['product:name'] as string) ?? 'New Device',
          [Device.ATTR_DEVTYPEHINT]: 'Switch',
          [Device.ATTR_VENDOR]: (product?.['product:vendor'] as string) ?? 'Acme',
          [Device.ATTR_PRODUCTID]: (product?.['product:id'] as string) ?? 'unknown',
          'devadv:protocolid': id,
          'devconn:state': 'ONLINE',
          'devpow:source': 'LINE',
          'swit:state': 'OFF',
        });
        Object.assign(pairing, {
          [PairingDevice.ATTR_PAIRINGSTATE]: PairingDevice.PAIRINGSTATE_PAIRED,
          [PairingDevice.ATTR_PAIRINGPHASE]: PairingDevice.PAIRINGPHASE_PAIRED,
          [PairingDevice.ATTR_DEVICEADDRESS]: deviceAddress,
        });
      });
      return {};
    },
    [PairingSubsystem.CMD_LISTPAIRINGDEVICES]: () => ({ devices: this.entitiesIn('SERV', 'pairdev') }),
    [PairingSubsystem.CMD_STOPSEARCHING]: () => ({}),
    [PairingSubsystem.CMD_DISMISSALL]: () => {
      for (const pairing of this.entitiesIn('SERV', 'pairdev')) {
        const address = pairing[Base.ATTR_ADDRESS] as string;
        delete this.data.entities[address];
        this.created.delete(address);
      }
      return {};
    },
    [PairingSubsystem.CMD_GETKITINFORMATION]: () => ({ kitInfo: this.data.kitInfo as unknown as Json }),
    [PairingDevice.CMD_CUSTOMIZE]: ({ destination }) => {
      this.mustGet(destination);
      return {};
    },
    [PairingDevice.CMD_ADDCUSTOMIZATION]: ({ destination, attrs }) => {
      const pairing = this.mustGet(destination);
      const customizations = new Set((pairing[PairingDevice.ATTR_CUSTOMIZATIONS] as string[]) ?? []);
      customizations.add(attrs.customization as string);
      pairing[PairingDevice.ATTR_CUSTOMIZATIONS] = [...customizations];
      return {};
    },

    // Professional monitoring
    'promon:GetSettings': () => ({ ...this.mustGet(`SERV:promon:${PLACE_ID}`) }),
    'promon:Activate': ({ destination }) => {
      this.mustGet(destination);
      return {};
    },
    'promon:TestCall': ({ destination }) => {
      this.mustGet(destination);
      this.later(500, () => {
        if (this.data.entities[destination]) {
          this.updateEntity(destination, { 'promon:testCallStatus': 'SUCCEEDED' });
        }
      });
      return {};
    },

    // API keys
    'apikey:ListKeys': () => ({ keys: this.data.apiKeys as unknown as Json }),
    'apikey:Create': ({ attrs }) => {
      const id = this.nextId('key');
      const key: ApiKeyFixture = {
        id,
        label: attrs.label as string,
        keyPrefix: `ak_${id.slice(-4)}`,
        permissions: attrs.permissions as string[],
        created: Date.now(),
        lastUsed: null,
        expiresAt: null,
        expired: false,
      };
      this.data.apiKeys.push(key);
      return { key: `${key.keyPrefix}.secret-token-${id}`, id };
    },
    'apikey:Revoke': ({ attrs }) => {
      const key = this.data.apiKeys.find((k) => k.id === attrs.id);
      if (!key) throw new PlatformFailure('error.notfound', 'Unknown key');
      key.expired = true;
      return {};
    },
    'apikey:Delete': ({ attrs }) => {
      this.data.apiKeys = this.data.apiKeys.filter((k) => k.id !== attrs.id);
      return {};
    },
  };

  private schedulerFor(target: string): Attrs {
    const scheduler = Object.values(this.data.entities)
      .find((e) => e[Base.ATTR_TYPE] === 'scheduler' && e[Scheduler.ATTR_TARGET] === target);
    if (!scheduler) throw new PlatformFailure('error.notfound', `No scheduler for ${target}`);
    return scheduler;
  }
}
