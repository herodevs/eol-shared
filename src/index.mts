export { xmlStringToJSON } from './cdx-xml-to-json.mjs';
export { trimCdxBom } from './trim-cdx-bom.mjs';
export { spdxToCdxBom } from './spdx-to-cdx.mjs';

export type {
  CdxBom,
  Component,
  Dependency,
  Hash,
  License,
  ExternalReference,
} from './types/index.mjs';
export { ComponentScope } from './types/index.mjs';
