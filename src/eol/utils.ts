import { PackageURL } from 'packageurl-js';
import type { CdxBom } from '../types/index.js';
import type {
  ComponentStatus,
  EolScanComponentMetadata,
} from '../types/eol-scan.js';

// Maps non-canonical PURL type tokens to their canonical equivalents.
// This is a PURL type→type alias map — not the engine's type→Ecosystem map.
const PURL_TYPE_ALIASES: Record<string, string> = {
  go: 'golang',
  rubygems: 'gem',
};

// Types whose namespace and name tokens are case-insensitive (registry-lowercased).
// golang, maven, gem, pypi, pub, and all others are EXCLUDED — their paths are case-sensitive.
const CASE_INSENSITIVE_TYPES = new Set(['nuget', 'composer', 'cargo', 'npm']);

/**
 * Normalizes a PURL string to its canonical identity form.
 *
 * Applies, in order:
 *   1. Parse with PackageURL.fromString — the library handles version isolation,
 *      qualifier/subpath separation, and percent-encoding correctly.
 *   2. Type-alias translation (go → golang, rubygems → gem).
 *   3. Ecosystem-aware case normalization (namespace + name lowercased for
 *      nuget, composer, cargo, npm only).
 *   4. Reconstruct with new PackageURL(...).toString() — the library serializes
 *      qualifiers and subpath with canonical percent-encoding.
 *
 * Version is byte-preserved. Qualifiers and subpath are canonically re-encoded
 * by the serializer (deterministic and idempotent).
 *
 * Returns the input unchanged for unparseable strings; never throws.
 *
 * The optional `onUncanonicalized` callback is invoked when the PURL parses
 * successfully but cannot be re-serialized into canonical form (e.g. the
 * packageurl-js golang validator limitation on bare-major versions like `@v1`).
 * It is NOT invoked on parse failures (non-PURL / malformed input — those
 * are silent passthroughs) and NOT invoked on success. A callback that
 * itself throws is silently ignored so it cannot break the identity path.
 */
export function canonicalizePurl(
  purl: string,
  onUncanonicalized?: (purl: string, error: unknown) => void,
): string {
  let parsed: PackageURL;
  try {
    parsed = PackageURL.fromString(purl);
  } catch {
    // Input is not a parseable PURL — return it unchanged. This is expected for
    // non-PURL input and is intentionally not reported via onUncanonicalized.
    return purl;
  }

  try {
    const type = PURL_TYPE_ALIASES[parsed.type] ?? parsed.type;
    let namespace = parsed.namespace;
    let name = parsed.name;
    if (CASE_INSENSITIVE_TYPES.has(type)) {
      namespace = namespace ? namespace.toLowerCase() : namespace;
      name = name.toLowerCase();
    }
    return new PackageURL(
      type,
      namespace ?? undefined,
      name,
      parsed.version ?? undefined,
      parsed.qualifiers ?? undefined,
      parsed.subpath ?? undefined,
    ).toString();
  } catch (error) {
    // The PURL parsed but could not be re-serialized into canonical form.
    // Return it unchanged and notify the caller so the anomaly is observable.
    try {
      onUncanonicalized?.(purl, error);
    } catch {
      // A misbehaving callback must not break the identity path.
    }
    return purl;
  }
}

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
  } catch {
    return null;
  }
}

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
