import { PackageURL } from 'packageurl-js';
import type { CdxBom } from '../types/index.mjs';
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

export function extractPurlsFromCdxBom(sbom: CdxBom): string[] {
  const purlSet = new Set<string>();

  for (const component of sbom.components ?? []) {
    if (component.purl) {
      purlSet.add(PackageURL.fromString(component.purl).toString());
    }
  }

  for (const dependency of sbom.dependencies ?? []) {
    if (dependency.ref) {
      purlSet.add(PackageURL.fromString(dependency.ref).toString());
    }

    if (dependency.dependsOn) {
      for (const dep of dependency.dependsOn) {
        purlSet.add(PackageURL.fromString(dep).toString());
      }
    }
  }

  return Array.from(purlSet);
}
