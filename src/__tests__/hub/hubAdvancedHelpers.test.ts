import { CellBackupSubsystem, Base } from '@arcus/core';
import { formatHex, formatPlatformJson } from '@/components/hub/formatPlatformJson';
import { cellBackupStatusLabel } from '@/components/hub/cellBackupStatus';

const ADDRESS = 'SERV:cellbackup:place-1';

describe('formatPlatformJson', () => {
  it.each([
    [undefined, '-'],
    [null, '-'],
    [5, '5'],
    [true, 'true'],
    ['abc', 'abc'],
    [[], 'None'],
    [{}, 'None'],
    [[1, 2], '1, 2'],
    [{ rssi: -60, hops: [1, 2] }, 'rssi: -60, hops: 1, 2'],
  ])('formats %p as %p', (value, expected) => {
    expect(formatPlatformJson(value)).toBe(expected);
  });
});

describe('formatHex', () => {
  it('formats a number as 0x hex', () => {
    expect(formatHex(0xab12)).toBe('0xAB12');
  });

  it('shows a dash for a missing value', () => {
    expect(formatHex(undefined)).toBe('-');
  });
});

describe('cellBackupStatusLabel', () => {
  function sub(status: string, extra: Record<string, string> = {}) {
    return { [Base.ATTR_ADDRESS]: ADDRESS, [CellBackupSubsystem.ATTR_STATUS]: status, ...extra };
  }

  it.each([
    [sub(CellBackupSubsystem.STATUS_ACTIVE), 'In use'],
    [sub(CellBackupSubsystem.STATUS_READY), 'Ready'],
    [sub(CellBackupSubsystem.STATUS_NOTREADY, { [CellBackupSubsystem.ATTR_NOTREADYSTATE]: CellBackupSubsystem.NOTREADYSTATE_NEEDSMODEM }), 'Needs a 4G modem in the hub'],
    [sub(CellBackupSubsystem.STATUS_NOTREADY, { [CellBackupSubsystem.ATTR_NOTREADYSTATE]: CellBackupSubsystem.NOTREADYSTATE_BOTH }), 'Needs the Cellular Backup add-on and a 4G modem'],
    [sub(CellBackupSubsystem.STATUS_NOTREADY), 'Not ready'],
    [sub(CellBackupSubsystem.STATUS_ERRORED, { [CellBackupSubsystem.ATTR_ERRORSTATE]: CellBackupSubsystem.ERRORSTATE_BANNED }), 'Cellular access suspended'],
    [sub(CellBackupSubsystem.STATUS_ERRORED), 'Cellular backup error'],
    [undefined, 'Unavailable'],
  ])('describes %p as %p', (value, expected) => {
    expect(cellBackupStatusLabel(value)).toBe(expected);
  });
});
