/**
 * Creates a trimmed copy of a CycloneDX BOM by removing SBOM data not necessary for EOL scanning.
 * Removes externalReferences, evidence, hashes, and properties from components.
 * @param cdxBom - The CycloneDX BOM to trim
 * @returns A new trimmed CycloneDX BOM object
 */
export function trimCdxBom(cdxBom) {
    const newBom = structuredClone(cdxBom);
    for (const component of newBom.components ?? []) {
        component.externalReferences = [];
        component.evidence = {};
        component.hashes = [];
        component.properties = [];
    }
    return newBom;
}
//# sourceMappingURL=trim-cdx-bom.js.map