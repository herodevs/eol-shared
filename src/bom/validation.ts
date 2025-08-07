import type { SPDX23 } from '../types/bom/spdx-2.3.schema.ts';
import type { CdxBom, SupportedBom } from '../types/index.js';

function parseBomOrString(bomOrString: string | object): SupportedBom | null {
  if (typeof bomOrString === 'string') {
    try {
      return JSON.parse(bomOrString);
    } catch {
      return null;
    }
  }
  return bomOrString as SupportedBom;
}

export function isCdxBom(bomOrString: string | object): bomOrString is CdxBom {
  const bom = parseBomOrString(bomOrString);
  return (
    bom !== null &&
    typeof bom === 'object' &&
    'components' in bom &&
    'bomFormat' in bom &&
    bom.bomFormat === 'CycloneDX'
  );
}

export function isSpdxBom(bomOrString: string | object): bomOrString is SPDX23 {
  const bom = parseBomOrString(bomOrString);
  return (
    bom !== null &&
    typeof bom === 'object' &&
    'SPDXID' in bom &&
    bom.SPDXID === 'SPDXRef-DOCUMENT' &&
    'spdxVersion' in bom &&
    typeof bom.spdxVersion === 'string' &&
    bom.spdxVersion.startsWith('SPDX-')
  );
}

export function isSupportedBom(
  bomOrString: string | object,
): bomOrString is SupportedBom {
  return isCdxBom(bomOrString) || isSpdxBom(bomOrString);
}
