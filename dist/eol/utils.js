import { PackageURL } from 'packageurl-js';
// Maps non-canonical PURL type tokens to their canonical equivalents.
// This is a PURL type→type alias map — not the engine's type→Ecosystem map.
const PURL_TYPE_ALIASES = {
    go: 'golang',
    rubygems: 'gem',
};
// Types whose namespace and name tokens are case-insensitive (registry-lowercased).
// golang, maven, gem, pypi, pub, and all others are EXCLUDED — their paths are case-sensitive.
const CASE_INSENSITIVE_TYPES = new Set(['nuget', 'composer', 'cargo', 'npm']);
function notifyUncanonicalized(purl, error, onUncanonicalized) {
    try {
        onUncanonicalized?.(purl, error);
    }
    catch {
        // A misbehaving callback must not break the identity path.
    }
}
function normalizeParsedPurlIdentity(purl) {
    const [rawType, rawNamespace, rawName, rawVersion, rawQualifiers, rawSubpath,] = PackageURL.parseString(purl);
    const type = PackageURL.Component.type.normalize(rawType);
    const name = PackageURL.Component.name.normalize(rawName);
    if (!type || !name) {
        return null;
    }
    return {
        type: PURL_TYPE_ALIASES[type] ?? type,
        namespace: PackageURL.Component.namespace.normalize(rawNamespace) ?? undefined,
        name,
        version: PackageURL.Component.version.normalize(rawVersion) ?? undefined,
        qualifiers: PackageURL.Component.qualifiers.normalize(rawQualifiers) ?? undefined,
        subpath: PackageURL.Component.subpath.normalize(rawSubpath) ?? undefined,
    };
}
function applyCaseNormalization(parts) {
    if (!CASE_INSENSITIVE_TYPES.has(parts.type)) {
        return parts;
    }
    return {
        ...parts,
        namespace: parts.namespace?.toLowerCase(),
        name: parts.name.toLowerCase(),
    };
}
function serializePurlIdentityParts(parts) {
    let purl = `pkg:${PackageURL.Component.type.encode(parts.type)}/`;
    if (parts.namespace) {
        purl += `${PackageURL.Component.namespace.encode(parts.namespace)}/`;
    }
    purl += PackageURL.Component.name.encode(parts.name);
    if (parts.version) {
        purl += `@${PackageURL.Component.version.encode(parts.version)}`;
    }
    if (parts.qualifiers) {
        purl += `?${PackageURL.Component.qualifiers.encode(parts.qualifiers)}`;
    }
    if (parts.subpath) {
        purl += `#${PackageURL.Component.subpath.encode(parts.subpath)}`;
    }
    return purl;
}
/**
 * Normalizes a PURL string to this package's canonical identity form.
 *
 * The implementation parses with packageurl-js and uses its component-level
 * normalizers/encoders, but intentionally avoids PackageURL construction for
 * identity serialization. That keeps versionless component identities portable
 * for ecosystems whose type validators require a version, such as Swift.
 *
 * Returns the input unchanged for unparseable strings; never throws.
 */
export function normalizePurlIdentity(purl, options = { version: 'preserve' }) {
    let parts;
    try {
        parts = normalizeParsedPurlIdentity(purl);
    }
    catch {
        // Input is not a parseable PURL — return it unchanged. This is expected for
        // non-PURL input and is intentionally not reported via onUncanonicalized.
        return purl;
    }
    if (!parts) {
        return purl;
    }
    try {
        const normalized = applyCaseNormalization({
            ...parts,
            version: options.version === 'omit' ? undefined : parts.version,
        });
        return serializePurlIdentityParts(normalized);
    }
    catch (error) {
        // The PURL parsed but could not be normalized or serialized into canonical
        // identity form. Return it unchanged and notify the caller so the anomaly
        // is observable.
        notifyUncanonicalized(purl, error, options.onUncanonicalized);
        return purl;
    }
}
function rawComponentPurlFromParsed(purl, parsed) {
    const identityEnd = purl.search(/[?#]/);
    const identityPart = identityEnd === -1 ? purl : purl.slice(0, identityEnd);
    const identityTail = identityEnd === -1 ? '' : purl.slice(identityEnd);
    if (!parsed.version) {
        return purl;
    }
    const versionSeparator = identityPart.lastIndexOf('@');
    return versionSeparator === -1
        ? purl
        : `${identityPart.slice(0, versionSeparator)}${identityTail}`;
}
export function createPurlIdentity(purl, onUncanonicalized) {
    let parsed;
    try {
        parsed = normalizeParsedPurlIdentity(purl);
    }
    catch {
        return { rawPurl: purl, canonicalComponentPurl: purl };
    }
    if (!parsed) {
        return { rawPurl: purl, canonicalComponentPurl: purl };
    }
    const rawComponentPurl = rawComponentPurlFromParsed(purl, parsed);
    const canonicalComponentPurl = normalizePurlIdentity(purl, {
        version: 'omit',
        onUncanonicalized,
    });
    const canonicalVersionPurl = parsed.version
        ? normalizePurlIdentity(purl, { version: 'preserve', onUncanonicalized })
        : undefined;
    const identity = { rawPurl: purl, canonicalComponentPurl };
    if (canonicalVersionPurl) {
        identity.canonicalVersionPurl = canonicalVersionPurl;
    }
    if (rawComponentPurl !== canonicalComponentPurl) {
        identity.legacyComponentPurl = rawComponentPurl;
    }
    return identity;
}
export function canonicalizeVersionFilter(filter) {
    if (!filter) {
        return undefined;
    }
    return {
        ...filter,
        contextPurls: filter.contextPurls.map((purl) => normalizePurlIdentity(purl, { version: 'preserve' })),
        ...(filter.resultPurls
            ? {
                resultPurls: filter.resultPurls.map((purl) => normalizePurlIdentity(purl, { version: 'preserve' })),
            }
            : {}),
    };
}
function isUnknownComponentMetadata(metadata) {
    return 'unknownReason' in metadata && metadata.unknownReason != null;
}
export function deriveComponentStatus(metadata) {
    if (!metadata || isUnknownComponentMetadata(metadata)) {
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
function safeParsePurl(purl) {
    try {
        return PackageURL.fromString(purl).toString();
    }
    catch {
        return null;
    }
}
export function extractPurlsFromCdxBom(sbom) {
    const purlSet = new Set();
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
//# sourceMappingURL=utils.js.map