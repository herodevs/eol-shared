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

export interface EolScanComponent {
  metadata: EolScanComponentMetadata | null;
  purl: string;
  nesRemediation?: { target: string } | null;
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
  eol: { report: { result: EolReport | null } };
}

export interface EolReportMutationResponse {
  eol: { createReport: { success: boolean; report: EolReport | null } };
}

export interface CreateEolReportInput {
  components: string[];
}

export const VALID_STATUSES = ['UNKNOWN', 'OK', 'EOL', 'EOL_UPCOMING'] as const;
export type ComponentStatus = (typeof VALID_STATUSES)[number];
