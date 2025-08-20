import type { CdxBom } from './index.js';

export interface CveStats {
  cveId: string;
  cvssScore: string | null;
  publishedAt: string;
}

export interface EolScanComponentMetadata {
  isEol: boolean;
  eolAt: string | null;
  eolReasons: string[];
  ecosystem: string | null;
  cveStats: CveStats[];
  releasedAt: Date | null;
  isNesPackage: boolean;
  nextSupportedVersion: EolScanNextSupportedVersion | null;
  daysBehindNextSupported: number | null;
  majorVersionsFromNextSupported: number | null;
}

export interface EolScanNextSupportedVersion {
  purl: string;
  version: string;
  releasedAt: Date;
}

export interface NesRemediation {
  remediations: {
    purls: { nes: string; oss: string };
    urls: { main: string };
  }[];
}

export interface EolScanComponent {
  metadata: EolScanComponentMetadata | null;
  purl: string;
  nesRemediation?: NesRemediation | null;
}

export interface EolReportMetadata {
  totalComponentsCount: number;
  unknownComponentsCount: number;
  totalUniqueComponentsCount: number;
}

export interface EolReport {
  id: string;
  createdOn: string;
  components: EolScanComponent[];
  metadata: EolReportMetadata;
  page: number;
  totalRecords: number;
}

export interface EolReportQueryResponse {
  eol: { report: EolReport | null };
}

export interface EolReportMutationResponse {
  eol: { createReport: { success: boolean; id: string; totalRecords: number } };
}

export interface CreateEolReportInputSbom {
  sbom: CdxBom;
}

// @deprecated
export interface CreateEolReportInputPurls {
  components: string[];
}

export type CreateEolReportInput =
  | CreateEolReportInputSbom
  | CreateEolReportInputPurls;

export interface GetEolReportInput {
  id: string;
  page?: number;
  size?: number;
}

export const VALID_STATUSES = [
  'UNKNOWN',
  'OK',
  'EOL',
  'EOL_UPCOMING',
  'NES_PACKAGE',
] as const;
export type ComponentStatus = (typeof VALID_STATUSES)[number];
