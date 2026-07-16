export const UNKNOWN_REASONS = [
    'not_identifiable',
    'no_listed_versions',
    'unsupported_ecosystem',
    'queued',
];
export function isUnknownReason(v) {
    return (typeof v === 'string' && UNKNOWN_REASONS.includes(v));
}
export const VALID_STATUSES = ['UNKNOWN', 'OK', 'EOL', 'EOL_UPCOMING'];
//# sourceMappingURL=eol-scan.js.map