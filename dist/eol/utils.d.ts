import type { CdxBom } from '../types/index.js';
import type { ComponentStatus, EolScanComponentMetadata } from '../types/eol-scan.js';
export declare function deriveComponentStatus(metadata: EolScanComponentMetadata | null): ComponentStatus;
export declare function extractPurlsFromCdxBom(sbom: CdxBom): string[];
//# sourceMappingURL=utils.d.ts.map