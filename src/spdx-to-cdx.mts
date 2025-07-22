import { randomUUID } from 'node:crypto';
import { Enums } from '@cyclonedx/cyclonedx-library';
import type * as CDX from '@cyclonedx/cyclonedx-library';
import type { SPDX23 } from './types/bom/spdx-2.3.schema.js';

type CdxBom = CDX.Serialize.JSON.Types.Normalized.Bom;
type Component = CDX.Serialize.JSON.Types.Normalized.Component;
type Dependency = CDX.Serialize.JSON.Types.Normalized.Dependency;
type Hash = CDX.Serialize.JSON.Types.Normalized.Hash;
type License = CDX.Serialize.JSON.Types.Normalized.License;
type ExternalReference = CDX.Serialize.JSON.Types.Normalized.ExternalReference;

type Scope =
  | Enums.ComponentScope.Required
  | Enums.ComponentScope.Optional
  | Enums.ComponentScope.Excluded;

const rank: Record<Scope, number> = {
  [Enums.ComponentScope.Required]: 3,
  [Enums.ComponentScope.Optional]: 2,
  [Enums.ComponentScope.Excluded]: 1,
};

const algorithmMap: Record<string, Enums.HashAlgorithm> = {
  MD5: Enums.HashAlgorithm.MD5,
  SHA1: Enums.HashAlgorithm['SHA-1'],
  SHA256: Enums.HashAlgorithm['SHA-256'],
  SHA384: Enums.HashAlgorithm['SHA-384'],
  SHA512: Enums.HashAlgorithm['SHA-512'],
  'SHA3-256': Enums.HashAlgorithm['SHA3-256'],
  'SHA3-384': Enums.HashAlgorithm['SHA3-384'],
  'SHA3-512': Enums.HashAlgorithm['SHA3-512'],
  'BLAKE2b-256': Enums.HashAlgorithm['BLAKE2b-256'],
  'BLAKE2b-384': Enums.HashAlgorithm['BLAKE2b-384'],
  'BLAKE2b-512': Enums.HashAlgorithm['BLAKE2b-512'],
  BLAKE3: Enums.HashAlgorithm.BLAKE3,
};

const LICENSE_EXPRESSION_REGEX = /\b(AND|OR|WITH)\b|\(|\)/;
const TOOL_NAME_REGEX = /^(.+)[-@](\d.*)$/;

function upgrade(c: Component, next: Scope) {
  if (!c.scope || rank[next] > rank[c.scope]) c.scope = next;
}

function mapScope(rel: string): Scope {
  switch (rel) {
    case 'OPTIONAL_DEPENDENCY_OF':
    case 'OPTIONAL_DEPENDENCY':
      return Enums.ComponentScope.Optional;
    case 'DEV_DEPENDENCY_OF':
    case 'BUILD_DEPENDENCY_OF':
    case 'TEST_DEPENDENCY_OF':
    case 'DEVELOPMENT_DEPENDENCY_OF':
    case 'BUILD_TOOL_OF':
      return Enums.ComponentScope.Excluded;
    default:
      return Enums.ComponentScope.Required;
  }
}

/**
 * Converts an SPDX BOM to CycloneDX format.
 * Takes the most important package and relationship data from SPDX and translates them into CycloneDX components and dependencies as closely as possible.
 * @param spdx - The SPDX BOM object to convert
 * @returns A CycloneDX BOM object
 */
export function spdxToCdxBom(spdx: SPDX23): CdxBom {
  const bom: CdxBom = {
    $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json',
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: spdx.creationInfo.created,
      tools: spdx.creationInfo.creators
        .filter((c) => c.startsWith('Tool: '))
        .map((c) => {
          const toolString = c.substring(6);
          const versionMatch = toolString.match(TOOL_NAME_REGEX);

          return versionMatch
            ? { name: versionMatch[1] || '', version: versionMatch[2] || '' }
            : { name: toolString || '', version: '' };
        }),
    },
    components: [],
    dependencies: [],
  };

  const idx = new Map<string, Component>();
  let rootComponent: Component | null = null;

  for (const p of spdx.packages ?? []) {
    const purl =
      p.externalRefs?.find((ref) => ref.referenceType === 'purl')
        ?.referenceLocator ?? '';

    const component: Component = {
      'bom-ref': `${p.name}@${p.versionInfo || ''}`,
      type: Enums.ComponentType.Library,
      name: p.name,
      version: p.versionInfo || '',
      description: p.description || '',
      purl,
    };

    if (spdx.documentDescribes?.includes(p.SPDXID)) {
      rootComponent = component;
    } else {
      bom.components!.push(component);
    }

    if (p.checksums) {
      component.hashes = p.checksums
        .map((checksum) => {
          const alg = algorithmMap[checksum.algorithm];
          if (!alg) return undefined;
          return { alg, content: checksum.checksumValue };
        })
        .filter((h): h is Hash => h !== undefined);
    }

    if (p.licenseDeclared && p.licenseDeclared !== 'NOASSERTION') {
      const license: License = LICENSE_EXPRESSION_REGEX.test(p.licenseDeclared)
        ? {
            expression: p.licenseDeclared,
            acknowledgement: Enums.LicenseAcknowledgement.Declared,
          }
        : {
            license: {
              id: p.licenseDeclared,
              acknowledgement: Enums.LicenseAcknowledgement.Declared,
            },
          };
      component.licenses = [license];
    }

    const externalReferences: ExternalReference[] = [];
    if (p.homepage && p.homepage !== 'NOASSERTION') {
      externalReferences.push({
        type: Enums.ExternalReferenceType.Website,
        url: p.homepage,
      });
    }
    if (p.downloadLocation && p.downloadLocation !== 'NOASSERTION') {
      externalReferences.push({
        type: Enums.ExternalReferenceType.Distribution,
        url: p.downloadLocation,
      });
    }
    if (externalReferences.length > 0) {
      component.externalReferences = externalReferences;
    }

    idx.set(p.SPDXID, component);
  }

  if (rootComponent) {
    bom.metadata!.component = rootComponent;
  }
  const deps = new Map<string, Dependency>();

  for (const component of idx.values()) {
    const dependency: Dependency = {
      ref: component['bom-ref'] as string,
      dependsOn: [],
    };
    deps.set(component['bom-ref'] as string, dependency);
    bom.dependencies!.push(dependency);
  }

  for (const r of spdx.relationships ?? []) {
    const from = idx.get(r.spdxElementId);
    const to = idx.get(r.relatedSpdxElement);
    if (!from || !to) continue;
    const fromBomRef = from['bom-ref'] as string;
    const toBomRef = to['bom-ref'] as string;

    const scope = mapScope(r.relationshipType);
    upgrade(to, scope);

    if (r.relationshipType.includes('DEPENDENCY_OF')) {
      const dependentRef = toBomRef;
      const dependencyRef = fromBomRef;

      // Optional dependencies aren't included in CycloneDx relationships.
      // This was validated and tested with the reference BOMs.
      if (scope === Enums.ComponentScope.Optional) {
        continue;
      }

      const d = deps.get(dependentRef);
      if (d && !d.dependsOn!.includes(dependencyRef)) {
        d.dependsOn!.push(dependencyRef);
      }
    }
  }

  return bom;
}
