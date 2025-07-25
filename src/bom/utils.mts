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

  if (metadata.isEol) {
    return 'EOL';
  }

  if ((metadata.eolAt ?? '') > new Date().toISOString()) {
    return 'EOL_UPCOMING';
  }

  return 'OK';
}
