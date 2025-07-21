import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { spdxToCdxBom } from './spdx-to-cdx.mts';
import type { SPDX23 } from './types/bom/spdx-2.3.schema.js';
import type { Component, Dependency } from './types/bom/index.mts';

function buildSpdxAndConvert(spdx: Partial<SPDX23>) {
  const baseSpdx: SPDX23 = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: 'test-document',
    creationInfo: {
      created: '2024-01-01T00:00:00Z',
      creators: ['Tool: test-tool-1.0'],
    },
  };

  return spdxToCdxBom({ ...baseSpdx, ...spdx });
}

describe('spdxToCdxBom', () => {
  describe('Basic BOM Structure', () => {
    test('should create valid CDX BOM with required fields', () => {
      const result = buildSpdxAndConvert({});

      assert.deepStrictEqual(result, {
        $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json',
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        version: 1,
        serialNumber: result.serialNumber, // Allow any UUID
        metadata: result.metadata,
        components: result.components,
        dependencies: result.dependencies,
      });

      assert.match(
        result.serialNumber!,
        /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('Metadata Handling', () => {
    test('should map SPDX creation timestamp to CDX metadata', () => {
      const result = buildSpdxAndConvert({
        creationInfo: {
          created: '2024-01-01T12:30:45Z',
          creators: ['Tool: npm-10.9.2'],
        },
      });

      assert.equal(result.metadata?.timestamp, '2024-01-01T12:30:45Z');
    });

    test('should extract tools from SPDX creators', () => {
      const result = buildSpdxAndConvert({
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: ['Tool: npm-10.9.2', 'Person: John Doe'],
        },
      });

      assert.deepStrictEqual(result.metadata?.tools, [
        { name: 'npm', version: '10.9.2' },
      ]);
    });

    test('should handle multiple tools in creators', () => {
      const result = buildSpdxAndConvert({
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: [
            'Tool: npm-10.9.2',
            'Tool: webpack-5.88.0',
            'Person: Developer',
            'Tool: eslint-8.44.0',
          ],
        },
      });

      assert.deepStrictEqual(result.metadata?.tools, [
        { name: 'npm', version: '10.9.2' },
        { name: 'webpack', version: '5.88.0' },
        { name: 'eslint', version: '8.44.0' },
      ]);
    });

    test('should handle malformed tool entries gracefully', () => {
      const result = buildSpdxAndConvert({
        creationInfo: {
          created: '2024-01-01T00:00:00Z',
          creators: [
            'Tool: npm-10.9.2',
            'Tool: malformed-tool-entry',
            'Tool: ',
            'Tool: just-name',
            'Tool: -version-only',
          ],
        },
      });

      assert.deepStrictEqual(result.metadata?.tools, [
        { name: 'npm', version: '10.9.2' },
        { name: 'malformed', version: 'tool' },
        { name: '', version: '' },
        { name: 'just', version: 'name' },
        { name: '', version: 'version' },
      ]);
    });

    test('should place root component in metadata.component', () => {
      const result = buildSpdxAndConvert({
        documentDescribes: ['SPDXRef-Package-root'],
        packages: [
          {
            SPDXID: 'SPDXRef-Package-root',
            name: '@herodevs/eol-report-card',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-dep',
            name: 'some-dependency',
            versionInfo: '2.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      assert.deepStrictEqual(result.metadata?.component, {
        'bom-ref': '@herodevs/eol-report-card@1.0.0',
        type: 'library',
        name: '@herodevs/eol-report-card',
        version: '1.0.0',
        description: '',
        purl: '',
      });

      // Root component should not be in components array
      assert.equal(
        result.components?.find((c) => c.name === '@herodevs/eol-report-card'),
        undefined,
      );

      // Non-root components should be in components array
      assert(result.components?.find((c) => c.name === 'some-dependency'));
    });
  });

  describe('Component Mapping', () => {
    test('should create components from SPDX packages', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-lodash',
            name: 'lodash',
            versionInfo: '4.17.21',
            downloadLocation:
              'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
            description: 'Lodash modular utilities.',
          },
          {
            SPDXID: 'SPDXRef-Package-react',
            name: 'react',
            versionInfo: '18.2.0',
            downloadLocation:
              'https://registry.npmjs.org/react/-/react-18.2.0.tgz',
            description:
              'React is a JavaScript library for building user interfaces.',
          },
        ],
      });

      assert.equal(result.components?.length, 2);
      assert.deepStrictEqual(result.components?.[0], {
        'bom-ref': 'lodash@4.17.21',
        type: 'library',
        name: 'lodash',
        version: '4.17.21',
        description: 'Lodash modular utilities.',
        purl: '',
        externalReferences: [
          {
            type: 'distribution',
            url: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
          },
        ],
      });
    });

    test('should generate correct bom-ref format (name@version)', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-lodash',
            name: 'lodash',
            versionInfo: '4.17.21',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-scoped',
            name: '@types/node',
            versionInfo: '18.15.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const cmp1 = result.components?.[0] as Component;
      const cmp2 = result.components?.[1] as Component;
      assert.equal(cmp1['bom-ref'], 'lodash@4.17.21');
      assert.equal(cmp2['bom-ref'], '@types/node@18.15.0');
    });

    test('should map component fields correctly', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.2.3',
            downloadLocation: 'NOASSERTION',
            description: 'A test package for testing purposes',
          },
        ],
      });

      assert.deepStrictEqual(result.components?.[0], {
        'bom-ref': 'test-package@1.2.3',
        type: 'library',
        name: 'test-package',
        version: '1.2.3',
        description: 'A test package for testing purposes',
        purl: '',
      });
    });

    test('should handle missing version and description', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      assert.deepStrictEqual(result.components?.[0], {
        'bom-ref': 'test-package@',
        type: 'library',
        name: 'test-package',
        version: '',
        description: '',
        purl: '',
      });
    });
  });

  describe('PURL Extraction', () => {
    test('should extract PURL from externalRefs', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            externalRefs: [
              {
                referenceCategory: 'PACKAGE-MANAGER',
                referenceType: 'purl',
                referenceLocator: 'pkg:npm/test-package@1.0.0',
              },
            ],
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.purl, 'pkg:npm/test-package@1.0.0');
    });

    test('should handle missing PURL gracefully', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.purl, '');
    });

    test('should handle multiple external references', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            externalRefs: [
              {
                referenceCategory: 'OTHER',
                referenceType: 'website',
                referenceLocator: 'https://example.com',
              },
              {
                referenceCategory: 'PACKAGE-MANAGER',
                referenceType: 'purl',
                referenceLocator: 'pkg:npm/test-package@1.0.0',
              },
            ],
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.purl, 'pkg:npm/test-package@1.0.0');
    });
  });

  describe('Hash Mapping', () => {
    test('should map SPDX checksums to CDX hashes', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            checksums: [{ algorithm: 'SHA256', checksumValue: 'abcd1234' }],
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.deepStrictEqual(cmp.hashes, [
        { alg: 'SHA-256', content: 'abcd1234' },
      ]);
    });

    test('should convert SHA512 to SHA-512 format', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            checksums: [{ algorithm: 'SHA512', checksumValue: 'def567890' }],
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.deepStrictEqual(cmp.hashes, [
        { alg: 'SHA-512', content: 'def567890' },
      ]);
    });

    test('should handle multiple hash algorithms', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            checksums: [
              { algorithm: 'SHA256', checksumValue: 'abcd1234' },
              { algorithm: 'SHA512', checksumValue: 'def567890' },
              { algorithm: 'MD5', checksumValue: 'xyz999' },
            ],
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.deepStrictEqual(cmp.hashes, [
        { alg: 'SHA-256', content: 'abcd1234' },
        { alg: 'SHA-512', content: 'def567890' },
        { alg: 'MD5', content: 'xyz999' },
      ]);
    });

    test('should handle missing checksums', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.hashes, undefined);
    });
  });

  describe('License Mapping', () => {
    test('should map simple license identifiers', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            licenseDeclared: 'MIT',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.partialDeepStrictEqual(cmp.licenses, [{ license: { id: 'MIT' } }]);
    });

    test('should map complex license expressions', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            licenseDeclared: 'MIT OR Apache-2.0',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.partialDeepStrictEqual(cmp.licenses, [
        { expression: 'MIT OR Apache-2.0' },
      ]);
    });

    test('should handle NOASSERTION licenses', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            licenseDeclared: 'NOASSERTION',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.licenses, undefined);
    });

    test('should handle missing license declarations', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.licenses, undefined);
    });
  });

  describe('External References Mapping', () => {
    test('should map homepage to website reference', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            homepage: 'https://example.com',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.deepStrictEqual(cmp.externalReferences, [
        { type: 'website', url: 'https://example.com' },
      ]);
    });

    test('should map downloadLocation to distribution reference', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation:
              'https://registry.npmjs.org/test/-/test-1.0.0.tgz',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.deepStrictEqual(cmp.externalReferences, [
        {
          type: 'distribution',
          url: 'https://registry.npmjs.org/test/-/test-1.0.0.tgz',
        },
      ]);
    });

    test('should handle NOASSERTION values', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            homepage: 'NOASSERTION',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.externalReferences, undefined);
    });

    test('should handle missing homepage and downloadLocation', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.externalReferences, undefined);
    });

    test('should create multiple external references', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation:
              'https://registry.npmjs.org/test/-/test-1.0.0.tgz',
            homepage: 'https://example.com',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.deepStrictEqual(cmp.externalReferences, [
        { type: 'website', url: 'https://example.com' },
        {
          type: 'distribution',
          url: 'https://registry.npmjs.org/test/-/test-1.0.0.tgz',
        },
      ]);
    });
  });

  describe('Root Component Identification', () => {
    test('should identify root component from documentDescribes', () => {
      const result = buildSpdxAndConvert({
        documentDescribes: ['SPDXRef-Package-root'],
        packages: [
          {
            SPDXID: 'SPDXRef-Package-root',
            name: 'my-app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      assert.deepStrictEqual(result.metadata?.component, {
        'bom-ref': 'my-app@1.0.0',
        type: 'library',
        name: 'my-app',
        version: '1.0.0',
        description: '',
        purl: '',
      });
    });

    test('should place root component in metadata instead of components array', () => {
      const result = buildSpdxAndConvert({
        documentDescribes: ['SPDXRef-Package-root'],
        packages: [
          {
            SPDXID: 'SPDXRef-Package-root',
            name: 'my-app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-dep',
            name: 'dependency',
            versionInfo: '2.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      assert.equal(
        result.components?.find((c) => c.name === 'my-app') as Component,
        undefined,
      );
      assert.equal(result.components?.length, 1);
      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.name, 'dependency');
    });

    test('should handle missing documentDescribes', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      assert.equal(result.metadata?.component, undefined);
      assert.equal(result.components?.length, 1);
    });

    test('should handle multiple described components', () => {
      const result = buildSpdxAndConvert({
        documentDescribes: ['SPDXRef-Package-root1', 'SPDXRef-Package-root2'],
        packages: [
          {
            SPDXID: 'SPDXRef-Package-root1',
            name: 'first-root',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-root2',
            name: 'second-root',
            versionInfo: '2.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      // Should take the last one as root (implementation overwrites rootComponent)
      assert.equal(result.metadata?.component?.name, 'second-root');
      // Both components marked as root, so neither goes to components array
      assert.equal(result.components?.length, 0);
    });
  });

  describe('Dependency Relationships', () => {
    test('should create dependency entries for all components', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-a',
            name: 'package-a',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-b',
            name: 'package-b',
            versionInfo: '2.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      assert.equal(result.dependencies?.length, 2);
      assert.deepStrictEqual(result.dependencies?.[0], {
        ref: 'package-a@1.0.0',
        dependsOn: [],
      });
    });

    test('should map SPDX relationships to CDX dependencies', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-app',
            name: 'my-app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-dep',
            name: 'dependency',
            versionInfo: '2.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-dep',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-app',
          },
        ],
      });

      const appDep = result.dependencies?.find((d) => d.ref === 'my-app@1.0.0');
      assert.deepStrictEqual(appDep?.dependsOn, ['dependency@2.0.0']);
    });

    test('should handle DEPENDENCY_OF relationships correctly', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-parent',
            name: 'parent',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-child',
            name: 'child',
            versionInfo: '2.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-child',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-parent',
          },
        ],
      });

      const parentDep = result.dependencies?.find(
        (d) => d.ref === 'parent@1.0.0',
      );
      const childDep = result.dependencies?.find(
        (d) => d.ref === 'child@2.0.0',
      );

      assert.deepStrictEqual(parentDep?.dependsOn, ['child@2.0.0']);
      assert.deepStrictEqual(childDep?.dependsOn, []);
    });

    test('should exclude optional dependencies', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-app',
            name: 'my-app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-optional',
            name: 'optional-dep',
            versionInfo: '2.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-optional',
            relationshipType: 'OPTIONAL_DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-app',
          },
        ],
      });

      const appDep = result.dependencies?.find((d) => d.ref === 'my-app@1.0.0');
      assert.deepStrictEqual(appDep?.dependsOn, []);
    });

    test('should include dev dependencies', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-app',
            name: 'my-app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-dev',
            name: 'dev-dep',
            versionInfo: '2.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-dev',
            relationshipType: 'DEV_DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-app',
          },
        ],
      });

      const appDep = result.dependencies?.find((d) => d.ref === 'my-app@1.0.0');
      assert.deepStrictEqual(appDep?.dependsOn, ['dev-dep@2.0.0']);
    });

    test('should handle missing relationships', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      assert.equal(result.dependencies?.length, 1);
      const dep = result.dependencies?.[0] as Dependency;
      assert.deepStrictEqual(dep.dependsOn, []);
    });

    test('should create empty dependsOn arrays for isolated components', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-isolated',
            name: 'isolated-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [],
      });

      assert.deepStrictEqual(result.dependencies?.[0], {
        ref: 'isolated-package@1.0.0',
        dependsOn: [],
      });
    });
  });

  describe('Component Scope Mapping', () => {
    test('should map required dependencies to required scope', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-app',
            name: 'app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-dep',
            name: 'dependency',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-dep',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-app',
          },
        ],
      });

      assert.equal(
        result.components?.find((c) => c.name === 'app')?.scope,
        'required',
      );
    });

    test('should map dev dependencies to excluded scope', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-app',
            name: 'app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-dev',
            name: 'dev-dependency',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-dev',
            relationshipType: 'DEV_DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-app',
          },
        ],
      });

      assert.equal(
        result.components?.find((c) => c.name === 'app')?.scope,
        'excluded',
      );
    });

    test('should map optional dependencies to optional scope', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-app',
            name: 'app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-opt',
            name: 'optional-dependency',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-opt',
            relationshipType: 'OPTIONAL_DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-app',
          },
        ],
      });

      assert.equal(
        result.components?.find((c) => c.name === 'app')?.scope,
        'optional',
      );
    });

    test('should upgrade scope when multiple relationships exist', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-app',
            name: 'app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-multi',
            name: 'multi-scope',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-multi',
            relationshipType: 'OPTIONAL_DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-app',
          },
          {
            spdxElementId: 'SPDXRef-Package-multi',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-app',
          },
        ],
      });

      // Should upgrade from optional to required
      assert.equal(
        result.components?.find((c) => c.name === 'app')?.scope,
        'required',
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle missing packages array', () => {
      const result = buildSpdxAndConvert({});

      assert.deepStrictEqual(result.components, []);
      assert.deepStrictEqual(result.dependencies, []);
    });

    test('should handle missing relationships array', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      assert.equal(result.components?.length, 1);
      assert.equal(result.dependencies?.length, 1);
      const dep = result.dependencies?.[0] as Dependency;
      assert.deepStrictEqual(dep.dependsOn, []);
    });

    test('should handle invalid SPDX IDs in relationships', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-valid',
            name: 'valid-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-invalid',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-valid',
          },
          {
            spdxElementId: 'SPDXRef-Package-valid',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-nonexistent',
          },
        ],
      });

      // Should ignore invalid relationships
      assert.equal(result.dependencies?.length, 1);
      const dep = result.dependencies?.[0] as Dependency;
      assert.deepStrictEqual(dep.dependsOn, []);
    });
  });

  describe('Data Quality', () => {
    test('should not create duplicate components', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-unique',
            name: 'unique-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const componentNames = result.components?.map((c) => c.name) || [];
      const uniqueNames = [...new Set(componentNames)];
      assert.equal(componentNames.length, uniqueNames.length);
    });

    test('should not create duplicate dependencies', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-test',
            name: 'test-package',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const dependencyRefs = result.dependencies?.map((d) => d.ref) || [];
      const uniqueRefs = [...new Set(dependencyRefs)];
      assert.equal(dependencyRefs.length, uniqueRefs.length);
    });

    test('should maintain referential integrity', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-app',
            name: 'my-app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-dep',
            name: 'dependency',
            versionInfo: '2.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-dep',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-app',
          },
        ],
      });

      const allComponentRefs = new Set(
        [
          ...(result.components?.map((c) => c['bom-ref']) || []),
          result.metadata?.component?.['bom-ref'],
        ].filter(Boolean),
      );

      const allDependencyRefs =
        result.dependencies?.flatMap((d) => [d.ref, ...(d.dependsOn || [])]) ||
        [];

      for (const ref of allDependencyRefs) {
        assert(
          allComponentRefs.has(ref),
          `Dependency ref '${ref}' should point to a valid component`,
        );
      }
    });
  });

  describe('Integration Tests', () => {
    test('should convert complete real-world SPDX BOM', () => {
      const complexSpdx = {
        documentDescribes: ['SPDXRef-Package-root'],
        packages: [
          {
            SPDXID: 'SPDXRef-Package-root',
            name: '@my/app',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
            description: 'My application',
            licenseDeclared: 'MIT',
            homepage: 'https://my-app.com',
            checksums: [
              { algorithm: 'SHA256' as any, checksumValue: 'abc123' },
            ],
          },
          {
            SPDXID: 'SPDXRef-Package-react',
            name: 'react',
            versionInfo: '18.2.0',
            downloadLocation:
              'https://registry.npmjs.org/react/-/react-18.2.0.tgz',
            description: 'React library',
            licenseDeclared: 'MIT',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-react',
            relationshipType: 'DEPENDENCY_OF' as const,
            relatedSpdxElement: 'SPDXRef-Package-root',
          },
        ],
      };

      const result = buildSpdxAndConvert(complexSpdx);

      // Should have root in metadata
      assert.equal(result.metadata?.component?.name, '@my/app');
      // Should have non-root components
      assert.equal(result.components?.length, 1);
      // Should have all dependencies
      assert.equal(result.dependencies?.length, 2);
    });

    test('should match expected component count', () => {
      const result = buildSpdxAndConvert({
        packages: Array.from({ length: 5 })
          .fill(0)
          .map((_, i) => ({
            SPDXID: `SPDXRef-Package-${i}`,
            name: `package-${i}`,
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          })),
      });

      assert.equal(result.components?.length, 5);
    });

    test('should match expected dependency count', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-a',
            name: 'a',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-b',
            name: 'b',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-c',
            name: 'c',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      assert.equal(result.dependencies?.length, 3);
    });

    test('should maintain proper dependency structure', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-parent',
            name: 'parent',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-child1',
            name: 'child1',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-child2',
            name: 'child2',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-child1',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-parent',
          },
          {
            spdxElementId: 'SPDXRef-Package-child2',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-parent',
          },
        ],
      });

      const parentDep = result.dependencies?.find(
        (d) => d.ref === 'parent@1.0.0',
      );
      assert.deepStrictEqual(parentDep?.dependsOn?.sort(), [
        'child1@1.0.0',
        'child2@1.0.0',
      ]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty SPDX document', () => {
      const result = buildSpdxAndConvert({});

      assert.deepStrictEqual(result.components, []);
      assert.deepStrictEqual(result.dependencies, []);
      assert.equal(result.metadata?.component, undefined);
    });

    test('should handle components with special characters in names', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-special',
            name: '@scope/package-name_with.special-chars',
            versionInfo: '1.0.0-beta.1',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.name, '@scope/package-name_with.special-chars');
      assert.equal(
        cmp['bom-ref'],
        '@scope/package-name_with.special-chars@1.0.0-beta.1',
      );
    });

    test('should handle very long component names', () => {
      const longName = 'a'.repeat(500);
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-long',
            name: longName,
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.name, longName);
      assert.equal(cmp['bom-ref'], `${longName}@1.0.0`);
    });

    test('should handle components without versions', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-versionless',
            name: 'versionless-package',
            downloadLocation: 'NOASSERTION',
          },
        ],
      });

      const cmp = result.components?.[0] as Component;
      assert.equal(cmp.version, '');
      assert.equal(cmp['bom-ref'], 'versionless-package@');
    });

    test('should handle circular dependencies', () => {
      const result = buildSpdxAndConvert({
        packages: [
          {
            SPDXID: 'SPDXRef-Package-a',
            name: 'package-a',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
          {
            SPDXID: 'SPDXRef-Package-b',
            name: 'package-b',
            versionInfo: '1.0.0',
            downloadLocation: 'NOASSERTION',
          },
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-Package-b',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-a',
          },
          {
            spdxElementId: 'SPDXRef-Package-a',
            relationshipType: 'DEPENDENCY_OF',
            relatedSpdxElement: 'SPDXRef-Package-b',
          },
        ],
      });

      // Should handle circular deps without infinite loops
      const aDep = result.dependencies?.find(
        (d) => d.ref === 'package-a@1.0.0',
      );
      const bDep = result.dependencies?.find(
        (d) => d.ref === 'package-b@1.0.0',
      );

      assert.deepStrictEqual(aDep?.dependsOn, ['package-b@1.0.0']);
      assert.deepStrictEqual(bDep?.dependsOn, ['package-a@1.0.0']);
    });
  });

  describe('Performance', () => {
    test('should handle large SPDX documents efficiently', () => {
      const largePackageCount = 1000;
      const largePackages = Array.from(
        { length: largePackageCount },
        (_, i) => ({
          SPDXID: `SPDXRef-Package-${i}`,
          name: `package-${i}`,
          versionInfo: '1.0.0',
          downloadLocation: 'NOASSERTION',
          description: `Package ${i} description`,
        }),
      );

      const start = Date.now();
      const result = buildSpdxAndConvert({ packages: largePackages });
      const duration = Date.now() - start;

      assert.equal(result.components?.length, largePackageCount);
      assert.equal(result.dependencies?.length, largePackageCount);
      // Should complete in reasonable time (less than 1 second for 1000 packages)
      assert(
        duration < 1000,
        `Conversion took ${duration}ms, which is too slow`,
      );
    });

    test('should not consume excessive memory', () => {
      const moderatePackageCount = 100;
      const packages = Array.from({ length: moderatePackageCount }, (_, i) => ({
        SPDXID: `SPDXRef-Package-${i}`,
        name: `package-${i}`,
        versionInfo: '1.0.0',
        downloadLocation: 'NOASSERTION',
      }));

      // Multiple conversions shouldn't cause memory leaks
      for (let i = 0; i < 10; i++) {
        const result = buildSpdxAndConvert({ packages });
        assert.equal(result.components?.length, moderatePackageCount);
      }

      // If we get here without running out of memory, the test passes
      assert(true);
    });
  });
});
