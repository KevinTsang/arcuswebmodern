export { default as ApiKeyService } from './ApiKeyService';
export { default as AccountService } from './AccountService';
export { default as AlarmService } from './AlarmService';
export { default as BridgeService } from './BridgeService';
export { default as DeviceService } from './DeviceService';
export { default as EasCodeService } from './EasCodeService';
export { default as I18NService } from './I18NService';
export { default as InvitationService } from './InvitationService';
export { default as IpcdService } from './IpcdService';
export { default as NwsSameCodeService } from './NwsSameCodeService';
export { default as PairingDeviceService } from './PairingDeviceService';
export { default as PersonService } from './PersonService';
export { default as PlaceService } from './PlaceService';
export { default as ProductCatalogService } from './ProductCatalogService';
export { default as ProMonitoringService } from './ProMonitoringService';
export { default as RuleService } from './RuleService';
export { default as SceneService } from './SceneService';
export { default as SchedulerService } from './SchedulerService';
export { default as SessionService } from './SessionService';
export { default as SubsystemService } from './SubsystemService';
export { default as SupportSearchService } from './SupportSearchService';
export { default as SupportSessionService } from './SupportSessionService';
export { default as VideoService } from './VideoService';

/**
 * Service map keyed by namespace, matching the original service.js pattern.
 */
import ApiKeyService from './ApiKeyService';
import AccountService from './AccountService';
import AlarmService from './AlarmService';
import BridgeService from './BridgeService';
import DeviceService from './DeviceService';
import EasCodeService from './EasCodeService';
import I18NService from './I18NService';
import InvitationService from './InvitationService';
import IpcdService from './IpcdService';
import NwsSameCodeService from './NwsSameCodeService';
import PairingDeviceService from './PairingDeviceService';
import PersonService from './PersonService';
import PlaceService from './PlaceService';
import ProductCatalogService from './ProductCatalogService';
import ProMonitoringService from './ProMonitoringService';
import RuleService from './RuleService';
import SceneService from './SceneService';
import SchedulerService from './SchedulerService';
import SessionService from './SessionService';
import SubsystemService from './SubsystemService';
import SupportSearchService from './SupportSearchService';
import SupportSessionService from './SupportSessionService';
import VideoService from './VideoService';

export const services = {
  apikey: ApiKeyService,
  account: AccountService,
  alarmservice: AlarmService,
  bridgesvc: BridgeService,
  dev: DeviceService,
  eascode: EasCodeService,
  i18n: I18NService,
  invite: InvitationService,
  ipcd: IpcdService,
  nwssamecode: NwsSameCodeService,
  pairdev: PairingDeviceService,
  person: PersonService,
  place: PlaceService,
  prodcat: ProductCatalogService,
  promon: ProMonitoringService,
  rule: RuleService,
  scene: SceneService,
  scheduler: SchedulerService,
  sess: SessionService,
  subs: SubsystemService,
  supportsearch: SupportSearchService,
  suppcustsession: SupportSessionService,
  video: VideoService,
} as const;
