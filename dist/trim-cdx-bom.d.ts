import type { CdxBom } from './types/index.ts';
/**
 * Creates a trimmed copy of a CycloneDX BOM by removing SBOM data not necessary for EOL scanning.
 * Removes externalReferences, evidence, hashes, and properties from components.
 * @param cdxBom - The CycloneDX BOM to trim
 * @returns A new trimmed CycloneDX BOM object
 */
export declare function trimCdxBom(cdxBom: CdxBom): CdxBom;
//# sourceMappingURL=trim-cdx-bom.d.ts.map