/*! This file is part of CycloneDX JavaScript Library.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
Copyright (c) OWASP Foundation. All Rights Reserved.
*/

import { compile } from 'json-schema-to-typescript';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_ROOT =
  'https://raw.githubusercontent.com/CycloneDX/specification/refs/tags/1.6.1/schema/';
const SOURCE_ROOT_LATEST =
  'https://raw.githubusercontent.com/CycloneDX/specification/refs/heads/master/schema/';
const SCHEMAS_TARGET_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'schemas',
);
const TYPES_TARGET_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'types',
  'bom',
);

const bomRequiredOriginal = `
  "required": [
    "bomFormat",
    "specVersion",
    "version"
  ],`;
const bomRequiredReplacement = `
  "required": [
    "bomFormat",
    "specVersion"
  ],`;

const bomConfig = {
  versions: ['1.6', '1.5', '1.4', '1.3', '1.2'],
  sourcePattern: `${SOURCE_ROOT}bom-%s.schema.json`,
  targetPattern: join(SCHEMAS_TARGET_ROOT, 'bom-%s.schema.json'),
  replacements: [
    [/,?\s*"format"\S*:\s*"string"/gs, ''],
    [
      /,?\s*"enum"\s*:\s*\[\s*"http:\/\/cyclonedx\.org\/schema\/.+?\.schema\.json"\s*\]/gs,
      '',
    ],
    [bomRequiredOriginal, bomRequiredReplacement],
  ],
};

if (!existsSync(SCHEMAS_TARGET_ROOT)) {
  mkdirSync(SCHEMAS_TARGET_ROOT);
}

if (!existsSync(TYPES_TARGET_ROOT)) {
  mkdirSync(TYPES_TARGET_ROOT, { recursive: true });
}

const otherDownloads = [
  [
    `${SOURCE_ROOT_LATEST}spdx.schema.json`,
    join(SCHEMAS_TARGET_ROOT, 'spdx.schema.json'),
  ],
  [
    `${SOURCE_ROOT_LATEST}jsf-0.82.schema.json`,
    join(SCHEMAS_TARGET_ROOT, 'jsf-0.82.schema.json'),
  ],
  [
    'https://raw.githubusercontent.com/spdx/spdx-spec/refs/heads/support/2.3/schemas/spdx-schema.json',
    join(SCHEMAS_TARGET_ROOT, 'spdx-2.3.schema.json'),
  ],
  [
    'https://spdx.github.io/spdx-spec/v3.0.1/rdf/schema.json',
    join(SCHEMAS_TARGET_ROOT, 'spdx-3.0.1.schema.json'),
  ],
];

async function downloadSchema(url) {
  return await fetch(url, { mode: 'no-cors' }).then((res) => res.text());
}

async function downloadOtherSchemas() {
  for (const [source, target] of otherDownloads) {
    try {
      const text = await downloadSchema(source);
      await writeFile(target, text);
      console.log(`Downloaded ${target.split('/').pop()}`);
    } catch (error) {
      console.error(`Failed to download ${source}:`, error);
    }
  }
}

async function applyReplacements(text, replacements) {
  let result = text;
  for (const [search, replace] of replacements) {
    result = result.replaceAll(search, replace);
  }
  return result;
}

async function generateTypeScriptDefinitions(target, version) {
  try {
    console.log(`Downloaded and processed ${version}`);

    // Read the BOM schema
    const bomSchemaContent = await readFile(target, 'utf8');
    const bomSchema = JSON.parse(bomSchemaContent);

    // Read the external schemas
    const jsfSchemaContent = await readFile(
      join(SCHEMAS_TARGET_ROOT, 'jsf-0.82.schema.json'),
      'utf8',
    );
    const jsfSchema = JSON.parse(jsfSchemaContent);

    const spdxSchemaContent = await readFile(
      join(SCHEMAS_TARGET_ROOT, 'spdx.schema.json'),
      'utf8',
    );
    const spdxSchema = JSON.parse(spdxSchemaContent);

    // Inline the external schemas into the BOM schema
    const inlinedSchema = {
      ...bomSchema,
      definitions: {
        ...bomSchema.definitions,
        ...jsfSchema.definitions,
        spdxLicenseId: spdxSchema,
      },
    };

    // Replace external references with internal ones
    const schemaString = JSON.stringify(inlinedSchema)
      .replace(
        /"\$ref":\s*"jsf-0\.82\.schema\.json"/g,
        '"$ref": "#/definitions/signature"',
      )
      .replace(
        /"\$ref":\s*"spdx\.schema\.json"/g,
        '"$ref": "#/definitions/spdxLicenseId"',
      );

    const processedSchema = JSON.parse(schemaString);

    // Compile to TypeScript
    const schemaType = await compile(processedSchema, 'BomSchema', {
      cwd: SCHEMAS_TARGET_ROOT,
      $refOptions: { continueOnError: true },
    });

    const typeFilePath = target
      .replace('/schemas', '/src/types/bom')
      .replace('.schema.json', '.schema.d.ts');
    await writeFile(typeFilePath, schemaType);
    console.log(`Generated TypeScript definitions for ${version}`);
  } catch (error) {
    console.log(`Failed to generate TypeScript for ${version}:`, error.message);
  }
}

async function processBomSchema(version) {
  try {
    const source = bomConfig.sourcePattern.replace('%s', version);
    const target = bomConfig.targetPattern.replace('%s', version);

    const text = await downloadSchema(source);
    const processedText = await applyReplacements(text, bomConfig.replacements);

    await writeFile(target, processedText);
    await generateTypeScriptDefinitions(target, version);
  } catch (error) {
    console.log(`Error processing version ${version}:`, error);
  }
}

async function generateStandaloneTypeScriptDefinitions() {
  const standaloneSchemas = [
    { file: 'spdx-2.3.schema.json', typeName: 'SpdxDocument' },
    { file: 'spdx-3.0.1.schema.json', typeName: 'SpdxDocument30' },
  ];

  for (const { file, typeName } of standaloneSchemas) {
    try {
      const schemaPath = join(SCHEMAS_TARGET_ROOT, file);
      const schemaContent = await readFile(schemaPath, 'utf8');
      const schema = JSON.parse(schemaContent);

      const schemaType = await compile(schema, typeName, {
        cwd: SCHEMAS_TARGET_ROOT,
        $refOptions: { continueOnError: true },
      });

      const typeFilePath = schemaPath
        .replace('/schemas', '/src/types/bom')
        .replace('.schema.json', '.schema.d.ts');
      await writeFile(typeFilePath, schemaType);
      console.log(`Generated TypeScript definitions for ${file}`);
    } catch (error) {
      console.log(`Failed to generate TypeScript for ${file}:`, error.message);
    }
  }
}

async function main() {
  await downloadOtherSchemas();

  // Process BOM schemas concurrently
  const promises = bomConfig.versions.map((version) =>
    processBomSchema(version),
  );
  await Promise.all(promises);

  // Generate TypeScript definitions for standalone schemas
  await generateStandaloneTypeScriptDefinitions();
}

main().catch(console.error);
