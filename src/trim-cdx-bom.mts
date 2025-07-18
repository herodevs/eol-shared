import type { CdxBom } from './types/bom/index.mts';

export function trimCdxBom(cdxBom: CdxBom): CdxBom {
  for (const component of cdxBom.components ?? []) {
    component.externalReferences = [];
    component.evidence = {};
    component.hashes = [];
    component.properties = [];
  }

  return cdxBom;
}
