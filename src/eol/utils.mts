import type {
  ComponentStatus,
  EolScanComponentMetadata,
} from '../types/eol-scan.mjs';

export function deriveComponentStatus(
  metadata: EolScanComponentMetadata | null,
): ComponentStatus {
  if (!metadata) {
    return 'UNKNOWN';
  }

  const eolAt = metadata.eolAt ?? '';
  const now = new Date().toISOString();

  if (metadata.isEol || (eolAt && eolAt <= now)) {
    return 'EOL';
  }

  if (eolAt > now) {
    return 'EOL_UPCOMING';
  }

  return 'OK';
}
