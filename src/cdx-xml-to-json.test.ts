import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { xmlStringToJSON } from './cdx-xml-to-json.ts';

describe('CycloneDX XML to JSON Converter', () => {
  test('should convert CycloneDX 1.4 XML to JSON with correct structure', async () => {
    const xmlContent = await readFile(
      'fixtures/cdx-bom-examples/bom.1.4.xml',
      'utf8',
    );
    const jsonContent = await readFile(
      'fixtures/cdx-bom-examples/bom.1.4.json',
      'utf8',
    );
    const result = await xmlStringToJSON(xmlContent);

    assert.deepEqual(result, JSON.parse(jsonContent));

    // Basic structure validation
    assert.equal(result.bomFormat, 'CycloneDX');
    assert.equal(result.specVersion, '1.4');
    assert.equal(result.version, 1);

    // Metadata validation
    assert(Array.isArray(result.metadata.tools));
    assert(result.metadata.tools.length >= 2);

    const firstTool = result.metadata.tools[0];
    assert.equal(firstTool.vendor, '@cyclonedx');
    assert.equal(firstTool.name, 'cyclonedx-library');

    // Component validation
    const component = result.metadata.component;
    assert(!Array.isArray(component));
    assert.equal(component.type, 'application');
    assert.equal(component['bom-ref'], 'juice-shop@14.1.1');

    // Components array validation
    assert(Array.isArray(result.components));
    assert(result.components.length > 0);
  });

  test('should handle multiple CycloneDX versions', async () => {
    const versions = ['1.2', '1.3', '1.4'];

    for (const version of versions) {
      const xmlContent = await readFile(
        `fixtures/cdx-bom-examples/bom.${version}.xml`,
        'utf8',
      );
      const result = await xmlStringToJSON(xmlContent);

      assert.equal(result.bomFormat, 'CycloneDX');
      assert.equal(result.specVersion, version);
      assert(Array.isArray(result.metadata.tools));
      assert(!Array.isArray(result.metadata.component));
    }
  });
});
