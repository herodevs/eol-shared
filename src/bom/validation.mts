import type { SPDX23 } from '../types/bom/spdx-2.3.schema.ts';
import type { CdxBom, SupportedBom } from '../types/index.mjs';

function parseBomOrString(bomOrString: string | object): SupportedBom | null {
  if (typeof bomOrString === 'string') {
    try {
      return JSON.parse(bomOrString);
    } catch (e) {
      return null;
    }
  }
  return bomOrString as SupportedBom;
}

export function isCdxBom(bomOrString: string | object): bomOrString is CdxBom {
  const bom = parseBomOrString(bomOrString);
  return (
    bom !== null &&
    'components' in bom &&
    'bomFormat' in bom &&
    bom.bomFormat === 'CycloneDX'
  );
}

export function isSpdxBom(bomOrString: string | object): bomOrString is SPDX23 {
  const bom = parseBomOrString(bomOrString);
  return bom !== null && 'SPDXID' in bom && bom.SPDXID === 'SPDXRef-Document';
}

export function isSupportedBom(
  bomOrString: string | object,
): bomOrString is SupportedBom {
  return isCdxBom(bomOrString) || isSpdxBom(bomOrString);
}
