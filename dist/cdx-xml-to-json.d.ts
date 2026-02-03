import type { CdxBom } from './index.ts';
/**
 * Converts a CycloneDX XML string to a JSON object.
 * The CycloneDX spec does not change between formats, so conversion from XML to JSON is lossless.
 * @param xml - The XML string to parse
 * @returns The parsed CycloneDX BOM object
 */
export declare function xmlStringToJSON(xml: string): CdxBom;
//# sourceMappingURL=cdx-xml-to-json.d.ts.map