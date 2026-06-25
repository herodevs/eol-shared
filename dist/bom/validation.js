function parseBomOrString(bomOrString) {
    if (typeof bomOrString === 'string') {
        try {
            return JSON.parse(bomOrString);
        }
        catch {
            return null;
        }
    }
    return bomOrString;
}
export function isCdxBom(bomOrString) {
    const bom = parseBomOrString(bomOrString);
    return (bom !== null &&
        typeof bom === 'object' &&
        'components' in bom &&
        'bomFormat' in bom &&
        bom.bomFormat === 'CycloneDX');
}
export function isSpdxBom(bomOrString) {
    const bom = parseBomOrString(bomOrString);
    return (bom !== null &&
        typeof bom === 'object' &&
        'SPDXID' in bom &&
        bom.SPDXID === 'SPDXRef-DOCUMENT' &&
        'spdxVersion' in bom &&
        typeof bom.spdxVersion === 'string' &&
        bom.spdxVersion.startsWith('SPDX-'));
}
export function isSupportedBom(bomOrString) {
    return isCdxBom(bomOrString) || isSpdxBom(bomOrString);
}
//# sourceMappingURL=validation.js.map