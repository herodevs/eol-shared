export { xmlStringToJSON } from './cdx-xml-to-json.js';
export { trimCdxBom } from './trim-cdx-bom.js';
export { spdxToCdxBom } from './spdx-to-cdx.js';
export { deriveComponentStatus, extractPurlsFromCdxBom, normalizePurlIdentity, createPurlIdentity, canonicalizeVersionFilter, } from './eol/utils.js';
export type { NormalizePurlIdentityOptions, NormalizePurlIdentityVersionMode, PurlIdentity, VersionedPurlFilter, } from './eol/utils.js';
export type * from './types/eol-scan.js';
export { UNKNOWN_REASONS, isUnknownReason } from './types/eol-scan.js';
export type * from './types/index.js';
export { ComponentScope } from './types/index.js';
export { isCdxBom, isSpdxBom, isSupportedBom } from './bom/validation.js';
//# sourceMappingURL=index.d.ts.map