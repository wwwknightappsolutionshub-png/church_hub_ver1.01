import { describe, expect, it } from 'vitest';
import { postLoginPath, unitAdminHomePath } from './session-role';

describe('unit admin login routing', () => {
  it('lands a single-unit admin on their unit detail', () => {
    expect(unitAdminHomePath(['unit-1'])).toBe('/dashboard/service-units/unit-1');
  });

  it('lands multi-unit admins on the hub list', () => {
    expect(unitAdminHomePath(['a', 'b'])).toBe('/dashboard/service-units');
  });

  it('postLoginPath prefers unit home for member bucket with unitAdminUnitIds', () => {
    expect(postLoginPath('member', { unitAdminUnitIds: ['harvesters'] })).toBe(
      '/dashboard/service-units/harvesters',
    );
  });

  it('postLoginPath keeps lounge for ordinary members', () => {
    expect(postLoginPath('member')).toBe('/dashboard/lounge');
    expect(postLoginPath('member', { unitAdminUnitIds: [] })).toBe('/dashboard/lounge');
  });

  it('does not override admin/pastor dashboard home', () => {
    expect(postLoginPath('church_admin', { unitAdminUnitIds: ['x'] })).toBe('/dashboard');
  });

  it('lands a deputy-only assistant on their unit detail', () => {
    expect(unitAdminHomePath([], ['unit-media'])).toBe('/dashboard/service-units/unit-media');
    expect(
      postLoginPath('member', { unitAdminUnitIds: [], unitDeputyUnitIds: ['unit-media'] }),
    ).toBe('/dashboard/service-units/unit-media');
  });

  it('merges admin + deputy ids and hubs when multiple', () => {
    expect(unitAdminHomePath(['a'], ['b'])).toBe('/dashboard/service-units');
    expect(
      postLoginPath('member', {
        unitAdminUnitIds: ['a'],
        unitDeputyUnitIds: ['b'],
      }),
    ).toBe('/dashboard/service-units');
  });
});
