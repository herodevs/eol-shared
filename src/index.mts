export { xmlStringToJSON } from './cdx-xml-to-json.mjs';
export { trimCdxBom } from './trim-cdx-bom.mjs';
export { spdxToCdxBom } from './spdx-to-cdx.mjs';
export { deriveComponentStatus, extractPurlsFromCdxBom } from './eol/utils.mjs';

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
} from './types/eol-scan.mjs';

export type {
  CdxBom,
  Component,
  Dependency,
  ExternalReference,
  Hash,
  License,
  SPDX23,
  SupportedBom,
} from './types/index.mjs';

export { ComponentScope } from './types/index.mjs';
export { isCdxBom, isSpdxBom, isSupportedBom } from './bom/validation.mjs';
