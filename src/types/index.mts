import * as CDX from '@cyclonedx/cyclonedx-library';
import type { SPDX23 } from './bom/spdx-2.3.schema.ts';

export type CdxBom = CDX.Serialize.JSON.Types.Normalized.Bom;
export type Component = CDX.Serialize.JSON.Types.Normalized.Component;
export type Dependency = CDX.Serialize.JSON.Types.Normalized.Dependency;
export type Hash = CDX.Serialize.JSON.Types.Normalized.Hash;
export type License = CDX.Serialize.JSON.Types.Normalized.License;
export type ExternalReference =
  CDX.Serialize.JSON.Types.Normalized.ExternalReference;

export type { SPDX23 };
export type SupportedBom = CdxBom | SPDX23;

export const ComponentScope = CDX.Enums.ComponentScope;
