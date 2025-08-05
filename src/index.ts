export { xmlStringToJSON } from './cdx-xml-to-json.js';
export { trimCdxBom } from './trim-cdx-bom.js';
export { spdxToCdxBom } from './spdx-to-cdx.js';
export { deriveComponentStatus, extractPurlsFromCdxBom } from './eol/utils.js';

export type {
  ComponentStatus,
  CreateEolReportInput,
  CveStats,
  EolScanComponentMetadata,
  EolScanComponent,
  EolReportMetadata,
  EolReport,
  EolReportQueryResponse,
  EolReportMutationResponse,
  NesRemediation,
} from './types/eol-scan.js';

export type {
  CdxBom,
  Component,
  Dependency,
  ExternalReference,
  Hash,
  License,
  SPDX23,
  SupportedBom,
} from './types/index.js';

export { ComponentScope } from './types/index.js';
export { isCdxBom, isSpdxBom, isSupportedBom } from './bom/validation.js';
