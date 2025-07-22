# @herodevs/eol-shared

A TypeScript utility library for End-of-Life (EOL) scanning and analysis.

## Installation

```bash
npm install @herodevs/eol-shared
```

## Requirements

- Node.js 22 or higher

## API

### [`spdxToCdxBom(spdxBom: SPDX23): CdxBom`](./src/spdx-to-cdx.mts#L61)

Converts an SPDX BOM to CycloneDX format. This conversion takes the most important package and relationship data from SPDX and translates them into CycloneDX components and dependencies as closely as possible.

```typescript
import { spdxToCdxBom } from '@herodevs/eol-shared';
import type { CdxBom } from '@herodevs/eol-shared';

const spdxBom = {
  /* your SPDX BOM data */
};
const cdxBom: CdxBom = spdxToCdxBom(spdxBom);
```

**Parameters**: `spdxBom` - The SPDX BOM object to convert  
**Returns**: A CycloneDX BOM object

### [`xmlStringToJSON(xmlString: string): CdxBom`](./src/cdx-xml-to-json.mts#L161)

Converts a CycloneDX XML string to a JSON object. The CycloneDX spec does not change between formats, so conversion from XML to JSON is lossless.

```typescript
import { xmlStringToJSON } from '@herodevs/eol-shared';
import type { CdxBom } from '@herodevs/eol-shared';

const xmlString = `<?xml version="1.0"?>...`;
const jsonBom: CdxBom = xmlStringToJSON(xmlString);
```

**Parameters**: `xmlString` - The XML string to parse  
**Returns**: The parsed CycloneDX BOM object

### [`trimCdxBom(cdxBom: CdxBom): CdxBom`](./src/trim-cdx-bom.mts#L3)

Creates a trimmed copy of a CycloneDX BOM by removing SBOM data not necessary for EOL scanning:

- `externalReferences` from components
- `evidence` from components
- `hashes` from components
- `properties` from components

```typescript
import { trimCdxBom } from '@herodevs/eol-shared';
import type { CdxBom } from '@herodevs/eol-shared';

const originalBom: CdxBom = {
  /* your CycloneDX BOM */
};
const trimmedBom: CdxBom = trimCdxBom(originalBom);
```

**Parameters**: `cdxBom` - The CycloneDX BOM to trim  
**Returns**: A new trimmed CycloneDX BOM object

### Types

The package exports the following TypeScript types:

- `CdxBom` - CycloneDX BOM structure as exported from [`@cyclonedx/cyclonedx-library`](https://github.com/CycloneDX/cyclonedx-javascript-library/blob/447db28f47ffd03b6f9c2f4a450bef0f0392c6bb/src/serialize/json/types.ts#L76)
- `Component` - Component definition
- `Dependency` - Dependency relationship
- `Hash` - Hash/checksum information
- `License` - License information
- `ExternalReference` - External reference data
- `ComponentScope` - Component scope enumeration

## Resources

This package is designed to work with:

- [CycloneDX](https://cyclonedx.org/) - Industry standard for Software Bill of Materials
- [SPDX](https://spdx.dev/) - Software Package Data Exchange standard
