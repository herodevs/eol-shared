import type { CdxBom } from './types/index.mts';

export function trimCdxBom(cdxBom: CdxBom): CdxBom {
  const newBom = structuredClone(cdxBom);

  for (const component of newBom.components ?? []) {
    component.externalReferences = [];
    component.evidence = {};
    component.hashes = [];
    component.properties = [];
  }

  return newBom;
}
