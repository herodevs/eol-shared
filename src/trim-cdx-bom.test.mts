import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { trimCdxBom } from './trim-cdx-bom.mts';
import type { CdxBom } from './types/index.mts';
import { Enums } from '@cyclonedx/cyclonedx-library';

describe('trimCdxBom', () => {
  test('should remove external references, evidence, hashes, and properties from components', () => {
    const mockBom: CdxBom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      version: 1,
      components: [
        {
          type: Enums.ComponentType.Library,
          name: 'test-component',
          externalReferences: [
            {
              type: Enums.ExternalReferenceType.Evidence,
              url: 'https://example.com',
            },
          ],
          evidence: { licenses: [] },
          hashes: [
            { alg: Enums.HashAlgorithm['SHA-1'], content: 'hash-content' },
          ],
          properties: [{ name: 'prop1', value: 'value1' }],
        },
        {
          type: Enums.ComponentType.Library,
          name: 'another-component',
          externalReferences: [
            {
              type: Enums.ExternalReferenceType.Evidence,
              url: 'https://example.com',
            },
          ],
          evidence: { copyright: [] },
          hashes: [{ alg: Enums.HashAlgorithm['MD5'], content: 'md5-hash' }],
          properties: [{ name: 'prop2', value: 'value2' }],
        },
      ],
    };

    const result = trimCdxBom(mockBom);

    assert.notDeepStrictEqual(result, mockBom);
    assert.partialDeepStrictEqual(result.components![0], {
      externalReferences: [],
      evidence: {},
      hashes: [],
      properties: [],
    });
    assert.partialDeepStrictEqual(result.components![1], {
      externalReferences: [],
      evidence: {},
      hashes: [],
      properties: [],
    });
  });

  test('should handle missing components array gracefully', () => {
    const mockBom: CdxBom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      version: 1,
    };

    assert.doesNotThrow(() => trimCdxBom(mockBom));
    const result = trimCdxBom(mockBom);
    assert.equal(result.components, undefined);
  });
});
