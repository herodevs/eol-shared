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
export declare const UNKNOWN_REASONS: readonly ["not_identifiable", "no_listed_versions", "unsupported_ecosystem", "queued"];
export type UnknownReason = (typeof UNKNOWN_REASONS)[number];
export interface UnknownComponentMetadata {
    unknownReason: UnknownReason;
}
export type ComponentMetadata = EolScanComponentMetadata | UnknownComponentMetadata;
export declare function isUnknownReason(v: unknown): v is UnknownReason;
export interface NesRemediation {
    remediations: {
        purls: {
            nes: string;
            oss: string;
        };
        urls: {
            main: string;
        };
    }[];
}
export type RemediationType = 'nes_available' | 'nes_ready' | 'version_update' | 'package_replacement';
export type RemediationActionType = 'direct' | 'contact' | 'enterprise_portal' | 'automated' | 'reference';
export interface RemediationAction {
    type: RemediationActionType;
    url?: string;
}
export interface RemediationTarget {
    purl: string;
    version?: string | null;
    releasedAt?: string | null;
    publishPurl?: string | null;
    nesPurl?: string | null;
    ossPurl?: string | null;
}
export interface Remediation {
    type: RemediationType;
    description: string;
    action: RemediationAction;
    target?: RemediationTarget;
}
export interface EolScanComponent {
    metadata: ComponentMetadata | null;
    purl: string;
    nesRemediation?: NesRemediation | null;
    remediations?: Remediation[] | null;
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
    eol: {
        report: EolReport | null;
    };
}
export interface EolReportMutationResponse {
    eol: {
        createReport: {
            success: boolean;
            id: string;
            totalRecords: number;
        };
    };
}
export interface CreateEolReportInputSbom {
    sbom: CdxBom;
    scanOrigin?: string;
}
export interface CreateEolReportInputPurls {
    components: string[];
}
export type CreateEolReportInput = CreateEolReportInputSbom | CreateEolReportInputPurls;
export interface GetEolReportInput {
    id: string;
    page?: number;
    size?: number;
}
export declare const VALID_STATUSES: readonly ["UNKNOWN", "OK", "EOL", "EOL_UPCOMING"];
export type ComponentStatus = (typeof VALID_STATUSES)[number];
//# sourceMappingURL=eol-scan.d.ts.map