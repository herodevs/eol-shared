import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { deriveComponentStatus } from './utils.ts';
import type { EolScanComponentMetadata } from '../types/eol-scan.ts';

// These are required for the object but not used to derive the status
const defaultMetadataProps = {
  eolReasons: [],
  cveStats: [],
  ecosystem: 'npm',
  releasedAt: new Date(),
  isNesPackage: false,
  nextSupportedVersion: null,
  daysBehindNextSupported: null,
  majorVersionsFromNextSupported: null,
};

describe('deriveComponentStatus', () => {
  test('should return UNKNOWN when there is no metadata', () => {
    const result = deriveComponentStatus(null);
    assert.equal(result, 'UNKNOWN');
  });

  test('should return EOL when isEol is true', () => {
    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: true,
      eolAt: null,
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL');
  });

  test('should return EOL when eolAt is in the past', () => {
    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: false,
      eolAt: '2020-01-01T00:00:00.000Z',
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL');
  });

  test('should return EOL when eolAt is current date', () => {
    const currentDate = new Date().toISOString();
    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: false,
      eolAt: currentDate,
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL');
  });

  test('should return EOL_UPCOMING when eolAt is in the future', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: false,
      eolAt: futureDate.toISOString(),
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL_UPCOMING');
  });

  test('should return OK when isEol is false and eolAt is null', () => {
    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: false,
      eolAt: null,
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'OK');
  });
});
