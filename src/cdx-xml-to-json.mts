import { XMLParser } from 'fast-xml-parser';
import type { CdxBom } from './index.mts';

const COLLECTION_KEYS = [
  'tools',
  'components',
  'externalReferences',
  'licenses',
  'properties',
  'dependencies',
];
const ARRAY_ELEMENTS = [
  'tool',
  'dependency',
  'reference',
  'license',
  'property',
  'vulnerability',
  'hash',
];

function getChildKey(key: string): string {
  if (key === 'tools') return 'tool';
  if (key === 'components') return 'component';
  if (key === 'externalReferences') return 'reference';
  if (key === 'licenses') return 'license';
  if (key === 'dependencies') return 'dependency';
  return 'property';
}

function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  isArray: (name: string, jpath) =>
    ARRAY_ELEMENTS.includes(name) ||
    (name === 'component' && jpath.includes('components')),
});

function processObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }

  if ('#text' in obj) {
    const { '#text': textValue, ...otherProps } = obj;
    if (Object.keys(otherProps).length === 0) {
      return textValue;
    }
    if (textValue) {
      otherProps.value = textValue;
    }
    return otherProps;
  }

  return obj;
}

function transform(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transform);
  }

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const processed = processObject(obj);

  if (Array.isArray(processed)) {
    return processed.map(transform);
  }

  if (typeof processed !== 'object' || processed === null) {
    return processed;
  }

  const result: any = {};

  for (const [key, value] of Object.entries<any>(processed)) {
    if (key === '?xml') continue;

    if (key === 'bom') {
      const bomData = transform(value);
      const xmlns = bomData.xmlns;
      const specVersion = xmlns?.match(/\/(\d+\.\d+)$/)?.[1] || '1.4';

      Object.assign(result, {
        $schema: `http://cyclonedx.org/schema/bom-${specVersion}.schema.json`,
        bomFormat: 'CycloneDX',
        specVersion,
        version: Number(bomData.version) || 1,
        ...Object.fromEntries(
          Object.entries(bomData).filter(
            ([k]) => k !== 'xmlns' && k !== 'version',
          ),
        ),
      });
    } else if (
      COLLECTION_KEYS.includes(key) &&
      value &&
      typeof value === 'object'
    ) {
      const childKey = getChildKey(key);
      const childValue = value[childKey];

      if (key === 'licenses' && childValue) {
        const licenses = ensureArray(childValue);
        result[key] = licenses.map((lic) => ({ license: transform(lic) }));
      } else if (key === 'licenses' && value.expression) {
        // Handle license expressions
        const expressions = ensureArray(value.expression);
        result[key] = expressions.map((expression) => ({ expression }));
      } else if (key === 'properties' && childValue) {
        const properties = ensureArray(childValue);
        result[key] = properties.map((prop) => {
          const transformed = transform(prop);
          // Ensure properties always have a value field
          if (!('value' in transformed)) {
            transformed.value = '';
          } else if (typeof transformed.value !== 'string') {
            transformed.value = String(transformed.value);
          }
          return transformed;
        });
      } else if (key === 'dependencies' && childValue) {
        const dependencies = ensureArray(childValue);
        result[key] = dependencies.map((dep) => {
          const transformed = transform(dep);
          // Handle nested dependencies - rename 'dependency' to 'dependsOn' and flatten refs
          if (transformed.dependency) {
            const nestedDeps = ensureArray(transformed.dependency);
            transformed.dependsOn = nestedDeps.map(
              (nestedDep) => nestedDep.ref || nestedDep,
            );
            delete transformed.dependency;
          }
          return transformed;
        });
      } else {
        result[key] = childValue ? transform(childValue) : transform(value);
      }
    } else if (key === 'hashes' && value?.hash) {
      const hashes = ensureArray(value.hash);
      result[key] = hashes.map((h) => ({
        alg: h.alg,
        content: h['#text'] || h.content || h,
      }));
    } else {
      result[key] = transform(value);
    }
  }

  return result;
}

/**
 * Converts a CycloneDX XML string to a JSON object.
 * The CycloneDX spec does not change between formats, so conversion from XML to JSON is lossless.
 * @param xml - The XML string to parse
 * @returns The parsed CycloneDX BOM object
 */
export function xmlStringToJSON(xml: string): CdxBom {
  const parsed = parser.parse(xml);
  return transform(parsed);
}
