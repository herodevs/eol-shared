import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { isCdxBom, isSpdxBom, isSupportedBom } from './validation.ts';
import type { CdxBom, Component } from '../types/index.js';
import type { SPDX23 } from '../types/bom/spdx-2.3.schema.ts';

function createValidCdxBom(overrides: Partial<CdxBom> = {}): CdxBom {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    components: [],
    ...overrides,
  };
}

function createValidSpdxBom(overrides: Partial<SPDX23> = {}): SPDX23 {
  return {
    SPDXID: 'SPDXRef-DOCUMENT',
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    name: 'test-document',
    creationInfo: {
      created: '2024-01-01T00:00:00Z',
      creators: ['Tool: test-tool-1.0'],
    },
    ...overrides,
  };
}

describe('BOM Validation', () => {
  describe('isCdxBom', () => {
    test('should identify valid CDX BOM object', () => {
      const validBom = createValidCdxBom();
      assert.equal(isCdxBom(validBom), true);
    });

    test('should identify valid CDX BOM from JSON string', () => {
      const validBom = createValidCdxBom();
      const jsonString = JSON.stringify(validBom);
      assert.equal(isCdxBom(jsonString), true);
    });

    test('should identify complex CDX BOM with metadata and components', () => {
      const complexBom = createValidCdxBom({
        metadata: {
          timestamp: '2024-01-20T10:30:00.000Z',
          tools: [{ name: 'cyclonedx-bom', version: '3.11.7' }],
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'pkg:npm/lodash@4.17.21',
            name: 'lodash',
            version: '4.17.21',
          } as Component,
        ],
      });
      assert.equal(isCdxBom(complexBom), true);
    });

    test('should reject BOM missing bomFormat', () => {
      const invalidBom = { ...createValidCdxBom() };
      delete (invalidBom as any).bomFormat;
      assert.equal(isCdxBom(invalidBom), false);
    });

    test('should reject BOM with wrong bomFormat', () => {
      const invalidBom = createValidCdxBom({ bomFormat: 'SPDX' as any });
      assert.equal(isCdxBom(invalidBom), false);
    });

    test('should reject BOM missing components', () => {
      const invalidBom = { ...createValidCdxBom() };
      delete (invalidBom as any).components;
      assert.equal(isCdxBom(invalidBom), false);
    });

    test('should reject malformed JSON string', () => {
      const malformedJson = '{"bomFormat": "CycloneDX", "components": [}';
      assert.equal(isCdxBom(malformedJson), false);
    });

    test('should reject empty string', () => {
      assert.equal(isCdxBom(''), false);
    });

    test('should reject null', () => {
      assert.equal(isCdxBom(null as any), false);
    });

    test('should reject undefined', () => {
      assert.equal(isCdxBom(undefined as any), false);
    });

    test('should reject non-object types', () => {
      assert.equal(isCdxBom(123 as any), false);
      assert.equal(isCdxBom(true as any), false);
      assert.equal(isCdxBom(['array']), false);
    });

    test('should reject SPDX BOM', () => {
      const spdxBom = createValidSpdxBom();
      assert.equal(isCdxBom(spdxBom), false);
    });
  });

  describe('isSpdxBom', () => {
    test('should identify valid SPDX BOM object', () => {
      const validBom = createValidSpdxBom();
      assert.equal(isSpdxBom(validBom), true);
    });

    test('should identify valid SPDX BOM from JSON string', () => {
      const validBom = createValidSpdxBom();
      const jsonString = JSON.stringify(validBom);
      assert.equal(isSpdxBom(jsonString), true);
    });

    test('should identify SPDX BOM with packages and relationships', () => {
      const complexBom = createValidSpdxBom({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-lodash',
            name: 'lodash',
            downloadLocation:
              'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-lodash',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-DOCUMENT',
          },
        ],
      });
      assert.equal(isSpdxBom(complexBom), true);
    });

    test('should reject BOM missing SPDXID', () => {
      const invalidBom = { ...createValidSpdxBom() };
      delete (invalidBom as any).SPDXID;
      assert.equal(isSpdxBom(invalidBom), false);
    });

    test('should reject BOM with wrong SPDXID format', () => {
      const invalidBom = createValidSpdxBom({ SPDXID: 'SPDXRef-Package-test' });
      assert.equal(isSpdxBom(invalidBom), false);
    });

    test('should reject BOM with wrong SPDXID value', () => {
      const invalidBom = createValidSpdxBom({ SPDXID: 'SPDXRef-Document' });
      assert.equal(isSpdxBom(invalidBom), false);
    });

    test('should reject BOM missing spdxVersion', () => {
      const invalidBom = { ...createValidSpdxBom() };
      delete (invalidBom as any).spdxVersion;
      assert.equal(isSpdxBom(invalidBom), false);
    });

    test('should reject BOM with wrong spdxVersion format', () => {
      const invalidBom = createValidSpdxBom({ spdxVersion: '2.3' });
      assert.equal(isSpdxBom(invalidBom), false);
    });

    test('should reject BOM with non-string spdxVersion', () => {
      const invalidBom = createValidSpdxBom({ spdxVersion: 2.3 as any });
      assert.equal(isSpdxBom(invalidBom), false);
    });

    test('should reject malformed JSON string', () => {
      const malformedJson =
        '{"SPDXID": "SPDXRef-DOCUMENT", "spdxVersion": "SPDX-2.3"';
      assert.equal(isSpdxBom(malformedJson), false);
    });

    test('should reject empty string', () => {
      assert.equal(isSpdxBom(''), false);
    });

    test('should reject null', () => {
      assert.equal(isSpdxBom(null as any), false);
    });

    test('should reject undefined', () => {
      assert.equal(isSpdxBom(undefined as any), false);
    });

    test('should reject non-object types', () => {
      assert.equal(isSpdxBom(123 as any), false);
      assert.equal(isSpdxBom(true as any), false);
      assert.equal(isSpdxBom(['array']), false);
    });

    test('should reject CDX BOM', () => {
      const cdxBom = createValidCdxBom();
      assert.equal(isSpdxBom(cdxBom), false);
    });
  });

  describe('isSupportedBom', () => {
    test('should identify valid CDX BOM as supported', () => {
      const cdxBom = createValidCdxBom();
      assert.equal(isSupportedBom(cdxBom), true);
    });

    test('should identify valid SPDX BOM as supported', () => {
      const spdxBom = createValidSpdxBom();
      assert.equal(isSupportedBom(spdxBom), true);
    });

    test('should identify valid CDX BOM string as supported', () => {
      const cdxBom = createValidCdxBom();
      const jsonString = JSON.stringify(cdxBom);
      assert.equal(isSupportedBom(jsonString), true);
    });

    test('should identify valid SPDX BOM string as supported', () => {
      const spdxBom = createValidSpdxBom();
      const jsonString = JSON.stringify(spdxBom);
      assert.equal(isSupportedBom(jsonString), true);
    });

    test('should reject invalid BOM formats', () => {
      const invalidBom = { format: 'unknown', version: '1.0', data: [] };
      assert.equal(isSupportedBom(invalidBom), false);
    });

    test('should reject malformed JSON string', () => {
      const malformedJson = '{"invalid": "json"';
      assert.equal(isSupportedBom(malformedJson), false);
    });

    test('should reject empty object', () => {
      assert.equal(isSupportedBom({}), false);
    });

    test('should reject primitive types', () => {
      assert.equal(isSupportedBom('not json'), false);
      assert.equal(isSupportedBom(123 as any), false);
      assert.equal(isSupportedBom(true as any), false);
      assert.equal(isSupportedBom(null as any), false);
      assert.equal(isSupportedBom(undefined as any), false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle objects with circular references', () => {
      const circularObj: any = { bomFormat: 'CycloneDX', components: [] };
      circularObj.self = circularObj;

      assert.doesNotThrow(() => isCdxBom(circularObj));
      assert.equal(isCdxBom(circularObj), true);
    });

    test('should handle very large JSON strings', () => {
      const largeBom = createValidCdxBom({
        components: Array.from(
          { length: 1000 },
          (_, i) =>
            ({
              type: 'library' as const,
              'bom-ref': `pkg:npm/package-${i}@1.0.0`,
              name: `package-${i}`,
              version: '1.0.0',
            }) as Component,
        ),
      });
      const largeJsonString = JSON.stringify(largeBom);

      assert.equal(isCdxBom(largeJsonString), true);
      assert.equal(isSupportedBom(largeJsonString), true);
    });

    test('should handle BOMs with special characters', () => {
      const bomWithSpecialChars = createValidCdxBom({
        components: [
          {
            type: 'library',
            'bom-ref': 'pkg:npm/@scope/package-with-special-chars@1.0.0',
            name: '@scope/package-with-special-chars',
            version: '1.0.0-beta.1+build.123',
          } as Component,
        ],
      });

      assert.equal(isCdxBom(bomWithSpecialChars), true);
    });

    test('should handle SPDX BOM with minimal required fields only', () => {
      const minimalSpdx = {
        SPDXID: 'SPDXRef-DOCUMENT',
        spdxVersion: 'SPDX-2.3',
      };

      assert.equal(isSpdxBom(minimalSpdx), true);
    });

    test('should handle CDX BOM with minimal required fields only', () => {
      const minimalCdx = { bomFormat: 'CycloneDX', components: [] };

      assert.equal(isCdxBom(minimalCdx), true);
    });

    test('should handle case sensitivity correctly', () => {
      const wrongCaseCdx = { bomformat: 'CycloneDX', components: [] };

      const wrongCaseSpdx = {
        spdxid: 'SPDXRef-DOCUMENT',
        spdxVersion: 'SPDX-2.3',
      };

      assert.equal(isCdxBom(wrongCaseCdx), false);
      assert.equal(isSpdxBom(wrongCaseSpdx), false);
    });
  });

  describe('Real-world Examples', () => {
    test('should validate real SPDX example structure', () => {
      const realSpdxExample = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'Example-SPDX-Document',
        documentNamespace: 'https://example.com/spdx/example-project',
        creationInfo: {
          created: '2025-01-20T10:30:00Z',
          creators: [
            'Tool: example-spdx-tool-1.0.0',
            'Person: John Doe (john@example.com)',
          ],
          licenseListVersion: '3.23',
        },
        packages: [
          {
            SPDXID: 'SPDXRef-Package-lodash',
            name: 'lodash',
            downloadLocation:
              'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
            filesAnalyzed: false,
            licenseConcluded: 'MIT',
            licenseDeclared: 'MIT',
            versionInfo: '4.17.21',
          },
        ],
      };

      assert.equal(isSpdxBom(realSpdxExample), true);
      assert.equal(isSupportedBom(realSpdxExample), true);
    });

    test('should validate real CDX example structure', () => {
      const realCdxExample = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
        version: 1,
        metadata: {
          timestamp: '2024-01-20T10:30:00.000Z',
          tools: [
            { vendor: 'CycloneDX', name: 'cyclonedx-bom', version: '3.11.7' },
          ],
          component: {
            type: 'application',
            'bom-ref': 'pkg:npm/example-app@1.0.0',
            name: 'example-app',
            version: '1.0.0',
            purl: 'pkg:npm/example-app@1.0.0',
          },
        },
        components: [
          {
            type: 'library',
            'bom-ref': 'pkg:npm/lodash@4.17.21',
            name: 'lodash',
            version: '4.17.21',
            purl: 'pkg:npm/lodash@4.17.21',
            scope: 'required',
            licenses: [{ license: { id: 'MIT' } }],
          } as Component,
        ],
      };

      assert.equal(isCdxBom(realCdxExample), true);
      assert.equal(isSupportedBom(realCdxExample), true);
    });
  });
});
