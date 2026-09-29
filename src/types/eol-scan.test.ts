import type {
  DependencySummary,
  EolScanComponent,
  NesRemediation,
} from './eol-scan.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;

type Assert<Condition extends true> = Condition;

export type DependencySummaryMatchesApiContract = Assert<
  Equal<
    DependencySummary,
    {
      directDependency: boolean | null;
      transitiveDependency: boolean | null;
      prodDependency: boolean | null;
      devDependency: boolean | null;
      dependencies: string[];
    }
  >
>;

export type ComponentDependencySummaryMatchesApiContract = Assert<
  Equal<EolScanComponent['dependencySummary'], DependencySummary | null>
>;

export type ComponentDependencySummaryIsRequired = Assert<
  Equal<
    {} extends Pick<EolScanComponent, 'dependencySummary'> ? true : false,
    false
  >
>;

export type NesRemediationCarriesTheFederationKey = Assert<
  Equal<NesRemediation['target'], string | undefined>
>;

export type ComponentNesRemediationIsTheCatalogStub = Assert<
  Equal<EolScanComponent['nesRemediation'], NesRemediation | null | undefined>
>;
