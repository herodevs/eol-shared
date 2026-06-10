import type { SPDX23 } from '../types/bom/spdx-2.3.schema.ts';
import type { CdxBom, SupportedBom } from '../types/index.js';
export declare function isCdxBom(bomOrString: string | object): bomOrString is CdxBom;
export declare function isSpdxBom(bomOrString: string | object): bomOrString is SPDX23;
export declare function isSupportedBom(bomOrString: string | object): bomOrString is SupportedBom;
//# sourceMappingURL=validation.d.ts.map