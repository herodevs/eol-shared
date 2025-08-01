import type { CdxBom } from './index.mjs';

export interface CveStats {
  cveId: string;
  cvssScore: number;
  publishedAt: string;
}

export interface EolScanComponentMetadata {
  isEol: boolean;
  eolAt: string | null;
  eolReasons: string[];
  cve: CveStats[];
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
}

export interface EolReport {
  id?: string;
  createdOn: string;
  components: EolScanComponent[];
  metadata: EolReportMetadata;
}

export interface EolReportQueryResponse {
  eol: { report: { report: EolReport | null } };
}

export interface EolReportMutationResponse {
  eol: { createReport: { success: boolean; report: EolReport | null } };
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

export const VALID_STATUSES = ['UNKNOWN', 'OK', 'EOL', 'EOL_UPCOMING'] as const;
export type ComponentStatus = (typeof VALID_STATUSES)[number];
