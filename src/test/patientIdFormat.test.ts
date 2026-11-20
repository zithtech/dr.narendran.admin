import { describe, expect, it } from 'vitest';
import { formatPatientDisplayName, initials } from '../lib/format';

describe('formatPatientDisplayName', () => {
  it('formats patient name and patient id correctly', () => {
    expect(formatPatientDisplayName('Bharathi', 'PA_001')).toBe('Bharathi (PA_001)');
  });

  it('avoids duplicate patient id if already present in name', () => {
    expect(formatPatientDisplayName('Bharathi (PA_001)', 'PA_001')).toBe('Bharathi (PA_001)');
  });

  it('returns just name when patient id is not provided or empty', () => {
    expect(formatPatientDisplayName('Bharathi', null)).toBe('Bharathi');
    expect(formatPatientDisplayName('Bharathi', '')).toBe('Bharathi');
    expect(formatPatientDisplayName('Bharathi', undefined)).toBe('Bharathi');
  });

  it('returns just id wrapped in parenthesis if name is empty', () => {
    expect(formatPatientDisplayName('', 'PA_001')).toBe('(PA_001)');
    expect(formatPatientDisplayName(null, 'PA_001')).toBe('(PA_001)');
  });

  it('returns empty string if neither name nor patient id is provided', () => {
    expect(formatPatientDisplayName('', '')).toBe('');
    expect(formatPatientDisplayName(null, null)).toBe('');
  });
});

describe('initials with patient id', () => {
  it('correctly calculates initials ignoring patient id suffix', () => {
    expect(initials('Bharathi (PA_001)')).toBe('B');
    expect(initials('Bharathi M (PA_001)')).toBe('BM');
    expect(initials('Dr. John Doe (PA_015)')).toBe('JD');
  });
});

