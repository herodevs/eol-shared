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

function mapHashAlgorithm(spdxAlg: string): Enums.HashAlgorithm | undefined {
  const upper = spdxAlg.toUpperCase();
  if (upper.startsWith('SHA')) {
    return `SHA-${upper.substring(3)}` as Enums.HashAlgorithm;
  }
  return upper as Enums.HashAlgorithm;
}

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
          const [name, version] = c.substring(6).split('-');
          return { name: name || '', version: version || '' };
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
          const alg = mapHashAlgorithm(checksum.algorithm);
          if (!alg) return undefined;
          return { alg, content: checksum.checksumValue };
        })
        .filter((h): h is Hash => h !== undefined);
    }

    if (p.licenseDeclared && p.licenseDeclared !== 'NOASSERTION') {
      const license: License =
        p.licenseDeclared.includes('AND') || p.licenseDeclared.includes('OR')
          ? { expression: p.licenseDeclared }
          : { license: { id: p.licenseDeclared } };
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

    upgrade(to, mapScope(r.relationshipType));

    if (r.relationshipType.includes('DEPENDENCY_OF')) {
      const dependentRef = toBomRef;
      const dependencyRef = fromBomRef;

      const scope = mapScope(r.relationshipType);
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
