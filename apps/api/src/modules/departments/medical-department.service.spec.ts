import { isSeriousIncident } from './medical.constants';

describe('MedicalDepartmentService', () => {
  it('flags serious categories', () => {
    expect(isSeriousIncident('FAINTING', 'LOW')).toBe(true);
    expect(isSeriousIncident('DIZZINESS', 'LOW')).toBe(false);
    expect(isSeriousIncident('OTHER', 'CRITICAL')).toBe(true);
  });
});
