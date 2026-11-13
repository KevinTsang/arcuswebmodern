import { Base, Halo, PetDoor, PetToken, Rule, RuleTemplate } from '@arcus/core';
import {
  defaultSmartKeyName, getPairedPetDoorTokens, getPetDoorLockLabel, getPetDoorTokens, petTokenAttr,
} from '@/lib/petDoor';
import { formatHaloTestResult, getHaloStatus } from '@/lib/haloStatus';
import {
  buildButtonRuleContext, findButtonRule, formatButtonLabel, getButtonActionOptions, getButtonProduct,
} from '@/lib/buttonAssignment';
import type { RuleTemplateEntity } from '@/store/entityTypes';
import { makeDevice, makeRule } from '../helpers/factories';

// ── Helpers ───────────────────────────────────────────────────────────

const DOOR = 'DRIV:dev:petdoor';
const FOB = 'DRIV:dev:fob';

function makeTemplate(id: string, name = id): RuleTemplateEntity {
  const address = `SERV:ruletmpl:${id}`;
  return { id: address, [Base.ATTR_ADDRESS]: address, [Base.ATTR_ID]: id, [RuleTemplate.ATTR_NAME]: name };
}

// ── Pet door ──────────────────────────────────────────────────────────

describe('petDoor', () => {
  it('builds instance attribute keys', () => {
    expect(petTokenAttr(PetToken.ATTR_PETNAME, 'pt2')).toBe('pettoken:petName:pt2');
  });

  it('lists every slot with defaults for missing names and ids', () => {
    const device = makeDevice(DOOR, {
      [PetDoor.ATTR_NUMPETTOKENSSUPPORTED]: 2,
      [petTokenAttr(PetToken.ATTR_PAIRED, 'pt1')]: true,
      [petTokenAttr(PetToken.ATTR_TOKENID, 'pt1')]: 11,
      [petTokenAttr(PetToken.ATTR_PETNAME, 'pt1')]: 'Rex',
      [petTokenAttr(PetToken.ATTR_PETNAME, 'pt2')]: '',
    });
    expect(getPetDoorTokens(device)).toEqual([
      { instance: 'pt1', index: 1, tokenId: 11, paired: true, petName: 'Rex' },
      { instance: 'pt2', index: 2, tokenId: null, paired: false, petName: defaultSmartKeyName(2) },
    ]);
    expect(getPairedPetDoorTokens(device).map((t) => t.instance)).toEqual(['pt1']);
  });

  it('returns no tokens without a device or a supported count', () => {
    expect(getPetDoorTokens(undefined)).toEqual([]);
    expect(getPetDoorTokens(makeDevice(DOOR))).toEqual([]);
    expect(getPetDoorTokens(makeDevice(DOOR, { [PetDoor.ATTR_NUMPETTOKENSSUPPORTED]: 0 }))).toEqual([]);
  });

  it.each([
    [PetDoor.LOCKSTATE_LOCKED, 'Locked'],
    [PetDoor.LOCKSTATE_UNLOCKED, 'Unlocked'],
    [PetDoor.LOCKSTATE_AUTO, 'Auto'],
    [undefined, 'Unknown'],
  ])('labels lock state %s as %s', (state, label) => {
    expect(getPetDoorLockLabel(state)).toBe(label);
  });
});

// ── Halo ──────────────────────────────────────────────────────────────

describe('haloStatus', () => {
  it.each([
    [Halo.DEVICESTATE_SAFE, 'Ok', 'ok'],
    [Halo.DEVICESTATE_SMOKE, 'Smoke Detected', 'alert'],
    [Halo.DEVICESTATE_CO, 'CO Detected', 'alert'],
    [Halo.DEVICESTATE_WEATHER, 'Weather Alert', 'warning'],
    [Halo.DEVICESTATE_EOL, 'End of Life', 'warning'],
  ])('maps %s to %s', (state, label, severity) => {
    expect(getHaloStatus(makeDevice('DRIV:dev:halo', { [Halo.ATTR_DEVICESTATE]: state }))).toEqual({ label, severity });
  });

  it('treats a missing or unknown state as Ok', () => {
    expect(getHaloStatus(undefined).label).toBe('Ok');
    expect(getHaloStatus(makeDevice('DRIV:dev:halo', { [Halo.ATTR_DEVICESTATE]: 'NEW' })).label).toBe('Ok');
  });

  it('formats test results', () => {
    expect(formatHaloTestResult(Halo.REMOTETESTRESULT_FAIL_CO_SENSOR)).toBe('Fail Co Sensor');
    expect(formatHaloTestResult(Halo.REMOTETESTRESULT_SUCCESS)).toBe('Success');
    expect(formatHaloTestResult(undefined)).toBe('Not tested');
  });
});

// ── Button assignment ─────────────────────────────────────────────────

describe('buttonAssignment', () => {
  const templates = [
    makeTemplate('smartfob-chime', 'Chime'),
    makeTemplate('smartfob-arm-on', 'Arm On'),
    makeTemplate('smartfob-unknown'),
    makeTemplate('smartfobgen1-disarm'),
    makeTemplate('button-panic'),
  ];

  it('knows the supported products', () => {
    expect(getButtonProduct('4fccbb')?.buttons).toEqual(['circle', 'diamond', 'square', 'hexagon']);
    expect(getButtonProduct('nope')).toBeNull();
    expect(getButtonProduct(undefined)).toBeNull();
  });

  it('formats button labels', () => {
    expect(formatButtonLabel('away')).toBe('Away');
    expect(formatButtonLabel('button')).toBe('Button');
  });

  it('picks the product templates in legacy order and skips unknown actions', () => {
    const options = getButtonActionOptions('4fccbb', templates);
    expect(options.map((o) => o.id)).toEqual(['smartfob-arm-on', 'smartfob-chime']);
    expect(options[0]).toMatchObject({
      address: 'SERV:ruletmpl:smartfob-arm-on', name: 'Arm On', description: 'Set Security Alarm To On',
    });
  });

  it('returns no options for an unsupported product', () => {
    expect(getButtonActionOptions('nope', templates)).toEqual([]);
  });

  it('finds the rule for a fob button, ignoring other buttons and custom rules', () => {
    const options = getButtonActionOptions('4fccbb', templates);
    const circle = makeRule('SERV:rule:1', {
      [Rule.ATTR_TEMPLATE]: 'smartfob-arm-on',
      [Rule.ATTR_CONTEXT]: { button: 'circle', 'smart fob': FOB },
    });
    const square = makeRule('SERV:rule:2', {
      [Rule.ATTR_TEMPLATE]: 'smartfob-chime',
      [Rule.ATTR_CONTEXT]: { button: 'square', 'smart fob': FOB },
    });
    const custom = makeRule('SERV:rule:3', {
      [Rule.ATTR_TEMPLATE]: 'custom',
      [Rule.ATTR_CONTEXT]: { button: 'diamond', device: FOB },
    });
    const rules = [circle, square, custom];
    expect(findButtonRule(rules, FOB, 'circle', options)).toBe(circle);
    expect(findButtonRule(rules, FOB, 'square', options)).toBe(square);
    expect(findButtonRule(rules, FOB, 'diamond', options)).toBeUndefined();
    expect(findButtonRule(rules, 'DRIV:dev:other', 'circle', options)).toBeUndefined();
  });

  it('matches a single button whose context button is the device address', () => {
    const options = getButtonActionOptions('bbf1cf', templates);
    const rule = makeRule('SERV:rule:4', {
      [Rule.ATTR_TEMPLATE]: 'button-panic',
      [Rule.ATTR_CONTEXT]: { button: FOB },
    });
    expect(findButtonRule([rule], FOB, 'button', options)).toBe(rule);
  });

  it('builds the rule context with the product key', () => {
    expect(buildButtonRuleContext('486390', FOB, 'home')).toEqual({ button: 'home', 'key fob': FOB });
    expect(buildButtonRuleContext(undefined, FOB, 'home')).toEqual({ button: 'home' });
  });
});
