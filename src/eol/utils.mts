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

function safeParsePurl(purl: string): string | null {
  try {
    return PackageURL.fromString(purl).toString();
  } catch (error) {
    return null;
  }
};

export function extractPurlsFromCdxBom(sbom: CdxBom): string[] {
  const purlSet = new Set<string>();

  for (const component of sbom.components ?? []) {
    if (component.purl) {
      const purl = safeParsePurl(component.purl);
      if (purl) {
        purlSet.add(purl);
      }
    }
  }

  for (const dependency of sbom.dependencies ?? []) {
    if (dependency.ref) {
      const purl = safeParsePurl(dependency.ref);
      if (purl) {
        purlSet.add(purl);
      }
    }

    for (const dep of dependency.dependsOn ?? []) {
      const purl = safeParsePurl(dep);
      if (purl) {
        purlSet.add(purl);
      }
    } 
  }

  return Array.from(purlSet);
}
