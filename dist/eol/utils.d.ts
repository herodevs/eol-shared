import type { CdxBom } from '../types/index.js';
import type { ComponentStatus, EolScanComponentMetadata } from '../types/eol-scan.js';
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
export declare function canonicalizePurl(purl: string, onUncanonicalized?: (purl: string, error: unknown) => void): string;
export declare function deriveComponentStatus(metadata: EolScanComponentMetadata | null): ComponentStatus;
export declare function extractPurlsFromCdxBom(sbom: CdxBom): string[];
//# sourceMappingURL=utils.d.ts.map