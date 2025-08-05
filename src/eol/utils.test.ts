import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { deriveComponentStatus } from './utils.ts';
import type { EolScanComponentMetadata } from '../types/eol-scan.ts';

describe('deriveComponentStatus', () => {
  test('should return UNKNOWN when there is no metadata', () => {
    const result = deriveComponentStatus(null);
    assert.equal(result, 'UNKNOWN');
  });

  test('should return EOL when isEol is true', () => {
    const metadata: EolScanComponentMetadata = {
      isEol: true,
      eolAt: null,
      eolReasons: ['End of life'],
      cve: [],
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL');
  });

  test('should return EOL when eolAt is in the past', () => {
    const metadata: EolScanComponentMetadata = {
      isEol: false,
      eolAt: '2020-01-01T00:00:00.000Z',
      eolReasons: ['End of life'],
      cve: [],
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL');
  });

  test('should return EOL when eolAt is current date', () => {
    const currentDate = new Date().toISOString();
    const metadata: EolScanComponentMetadata = {
      isEol: false,
      eolAt: currentDate,
      eolReasons: [],
      cve: [],
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL');
  });

  test('should return EOL_UPCOMING when eolAt is in the future', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const metadata: EolScanComponentMetadata = {
      isEol: false,
      eolAt: futureDate.toISOString(),
      eolReasons: [],
      cve: [],
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL_UPCOMING');
  });

  test('should return OK when isEol is false and eolAt is null', () => {
    const metadata: EolScanComponentMetadata = {
      isEol: false,
      eolAt: null,
      eolReasons: [],
      cve: [],
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'OK');
  });
});
