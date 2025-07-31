import type { SPDX23 } from '../types/bom/spdx-2.3.schema.ts';
import type { CdxBom, SupportedBom } from '../types/index.mjs';

function parseBomOrString(bomOrString: string | object): CdxBom | SPDX23 | null {
  if (typeof bomOrString === 'string') {
    try {
      return JSON.parse(bomOrString) as CdxBom | SPDX23;
    } catch (e) {
      return null;
    }
  }
  return bomOrString as CdxBom | SPDX23;
}

export function isCdxBom(bomOrString: string | object): bomOrString is CdxBom {
  const bom = parseBomOrString(bomOrString);
  return bom !== null && 'components' in bom;
}

export function isSpdxBom(bomOrString: string | object): bomOrString is SPDX23 {
  const bom = parseBomOrString(bomOrString);
  return bom !== null && 'SPDXID' in bom && bom.SPDXID === 'SPDX';
}

export function isSupportedBom(bomOrString: string | object): bomOrString is SupportedBom {
  return isCdxBom(bomOrString) || isSpdxBom(bomOrString);
}