import { randomUUID } from 'node:crypto';
import { Enums } from '@cyclonedx/cyclonedx-library';
const rank = {
    [Enums.ComponentScope.Required]: 3,
    [Enums.ComponentScope.Optional]: 2,
    [Enums.ComponentScope.Excluded]: 1,
};
const algorithmMap = {
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
function upgrade(c, next) {
    if (!c.scope || rank[next] > rank[c.scope])
        c.scope = next;
}
function mapScope(rel) {
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
export function spdxToCdxBom(spdx) {
    const bom = {
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
    const idx = new Map();
    let rootComponent = null;
    for (const p of spdx.packages ?? []) {
        const purl = p.externalRefs?.find((ref) => ref.referenceType === 'purl')
            ?.referenceLocator ?? '';
        const component = {
            'bom-ref': `${p.name}@${p.versionInfo || ''}`,
            type: Enums.ComponentType.Library,
            name: p.name,
            version: p.versionInfo || '',
            description: p.description || '',
            purl,
        };
        if (spdx.documentDescribes?.includes(p.SPDXID)) {
            rootComponent = component;
        }
        else {
            bom.components.push(component);
        }
        if (p.checksums) {
            component.hashes = p.checksums
                .map((checksum) => {
                const alg = algorithmMap[checksum.algorithm];
                if (!alg)
                    return undefined;
                return { alg, content: checksum.checksumValue };
            })
                .filter((h) => h !== undefined);
        }
        if (p.licenseDeclared && p.licenseDeclared !== 'NOASSERTION') {
            const license = LICENSE_EXPRESSION_REGEX.test(p.licenseDeclared)
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
        const externalReferences = [];
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
        bom.metadata.component = rootComponent;
    }
    const deps = new Map();
    for (const component of idx.values()) {
        const dependency = {
            ref: component['bom-ref'],
            dependsOn: [],
        };
        deps.set(component['bom-ref'], dependency);
        bom.dependencies.push(dependency);
    }
    for (const r of spdx.relationships ?? []) {
        const from = idx.get(r.spdxElementId);
        const to = idx.get(r.relatedSpdxElement);
        if (!from || !to)
            continue;
        const fromBomRef = from['bom-ref'];
        const toBomRef = to['bom-ref'];
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
            if (d && !d.dependsOn.includes(dependencyRef)) {
                d.dependsOn.push(dependencyRef);
            }
        }
    }
    return bom;
}
//# sourceMappingURL=spdx-to-cdx.mjs.map