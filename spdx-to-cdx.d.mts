import type * as CDX from '@cyclonedx/cyclonedx-library';
import type { SPDX23 } from './types/bom/spdx-2.3.schema.js';
type CdxBom = CDX.Serialize.JSON.Types.Normalized.Bom;
/**
 * Converts an SPDX BOM to CycloneDX format.
 * Takes the most important package and relationship data from SPDX and translates them into CycloneDX components and dependencies as closely as possible.
 * @param spdx - The SPDX BOM object to convert
 * @returns A CycloneDX BOM object
 */
export declare function spdxToCdxBom(spdx: SPDX23): CdxBom;
export {};
//# sourceMappingURL=spdx-to-cdx.d.mts.map