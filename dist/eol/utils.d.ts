import type { CdxBom } from '../types/index.js';
import type { ComponentStatus, EolScanComponentMetadata } from '../types/eol-scan.js';
export type PurlIdentity = {
    rawPurl: string;
    canonicalComponentPurl: string;
    canonicalVersionPurl?: string;
    legacyComponentPurl?: string;
};
export type VersionedPurlFilter = {
    contextPurls: string[];
    resultPurls?: string[];
};
export type NormalizePurlIdentityVersionMode = 'preserve' | 'omit';
export type NormalizePurlIdentityOptions = {
    version: NormalizePurlIdentityVersionMode;
    onUncanonicalized?: ((purl: string, error: unknown) => void) | undefined;
};
/**
 * Normalizes a PURL string to this package's canonical identity form.
 *
 * The implementation parses with packageurl-js and uses its component-level
 * normalizers/encoders, but intentionally avoids PackageURL construction for
 * identity serialization. That keeps versionless component identities portable
 * for ecosystems whose type validators require a version, such as Swift.
 *
 * Returns the input unchanged for unparseable strings; never throws.
 */
export declare function normalizePurlIdentity(purl: string, options?: NormalizePurlIdentityOptions): string;
export declare function createPurlIdentity(purl: string, onUncanonicalized?: (purl: string, error: unknown) => void): PurlIdentity;
export declare function canonicalizeVersionFilter<TFilter extends {
    contextPurls: string[];
    resultPurls?: string[];
}>(filter?: TFilter): TFilter | undefined;
export declare function deriveComponentStatus(metadata: EolScanComponentMetadata | null): ComponentStatus;
export declare function extractPurlsFromCdxBom(sbom: CdxBom): string[];
//# sourceMappingURL=utils.d.ts.map