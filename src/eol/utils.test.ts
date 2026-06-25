import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  deriveComponentStatus,
  normalizePurlIdentity,
  createPurlIdentity,
  canonicalizeVersionFilter,
} from './utils.ts';
import type { EolScanComponentMetadata } from '../types/eol-scan.ts';

// These are required for the object but not used to derive the status
const defaultMetadataProps = {
  eolReasons: [],
  cveStats: [],
  ecosystem: 'npm',
  releasedAt: new Date(),
  isNesPackage: false,
  nextSupportedVersion: null,
  daysBehindNextSupported: null,
  majorVersionsFromNextSupported: null,
};

describe('deriveComponentStatus', () => {
  test('should return UNKNOWN when there is no metadata', () => {
    const result = deriveComponentStatus(null);
    assert.equal(result, 'UNKNOWN');
  });

  test('should return EOL when isEol is true', () => {
    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: true,
      eolAt: null,
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL');
  });

  test('should return EOL when eolAt is in the past', () => {
    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: false,
      eolAt: '2020-01-01T00:00:00.000Z',
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL');
  });

  test('should return EOL when eolAt is current date', () => {
    const currentDate = new Date().toISOString();
    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: false,
      eolAt: currentDate,
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL');
  });

  test('should return EOL_UPCOMING when eolAt is in the future', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: false,
      eolAt: futureDate.toISOString(),
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'EOL_UPCOMING');
  });

  test('should return OK when isEol is false and eolAt is null', () => {
    const metadata: EolScanComponentMetadata = {
      ...defaultMetadataProps,
      isEol: false,
      eolAt: null,
    };

    const result = deriveComponentStatus(metadata);
    assert.equal(result, 'OK');
  });
});

describe('createPurlIdentity', () => {
  test('creates versioned identity with alias canonical component and version purls', () => {
    assert.deepEqual(createPurlIdentity('pkg:go/github.com/foo/bar@v1.0.0'), {
      rawPurl: 'pkg:go/github.com/foo/bar@v1.0.0',
      canonicalComponentPurl: 'pkg:golang/github.com/foo/bar',
      canonicalVersionPurl: 'pkg:golang/github.com/foo/bar@v1.0.0',
      legacyComponentPurl: 'pkg:go/github.com/foo/bar',
    });
  });

  test('creates versioned identity with case-folded canonical and raw legacy component purls', () => {
    assert.deepEqual(
      createPurlIdentity('pkg:nuget/Serilog.Sinks.Console@2.1.0'),
      {
        rawPurl: 'pkg:nuget/Serilog.Sinks.Console@2.1.0',
        canonicalComponentPurl: 'pkg:nuget/serilog.sinks.console',
        canonicalVersionPurl: 'pkg:nuget/serilog.sinks.console@2.1.0',
        legacyComponentPurl: 'pkg:nuget/Serilog.Sinks.Console',
      },
    );
  });

  test('creates versioned identity without legacy component when case-sensitive canonical output is unchanged', () => {
    assert.deepEqual(
      createPurlIdentity('pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0'),
      {
        rawPurl: 'pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0',
        canonicalComponentPurl: 'pkg:maven/org.Apache.Commons/commons-Lang3',
        canonicalVersionPurl:
          'pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0',
      },
    );
  });

  test('creates versionless identity without adding a version purl', () => {
    assert.deepEqual(createPurlIdentity('pkg:cargo/MyLib'), {
      rawPurl: 'pkg:cargo/MyLib',
      canonicalComponentPurl: 'pkg:cargo/mylib',
      legacyComponentPurl: 'pkg:cargo/MyLib',
    });
  });

  test('passes through parse failures as component identity without throwing', () => {
    assert.deepEqual(createPurlIdentity('not-a-purl'), {
      rawPurl: 'not-a-purl',
      canonicalComponentPurl: 'not-a-purl',
    });
  });

  test('creates a versionless Swift component identity from a versioned Swift PURL', () => {
    const calls: Array<{ purl: string; error: unknown }> = [];

    assert.deepEqual(
      createPurlIdentity(
        'pkg:swift/github.com/apple/swift-argument-parser@1.2.3',
        (purl, error) => {
          calls.push({ purl, error });
        },
      ),
      {
        rawPurl: 'pkg:swift/github.com/apple/swift-argument-parser@1.2.3',
        canonicalComponentPurl:
          'pkg:swift/github.com/apple/swift-argument-parser',
        canonicalVersionPurl:
          'pkg:swift/github.com/apple/swift-argument-parser@1.2.3',
      },
    );
    assert.equal(calls.length, 0);
  });

  test('keeps Debian qualified component identities distinct when version is removed', () => {
    const i386Identity = createPurlIdentity(
      'pkg:deb/debian/curl@7.50.3-1?arch=i386&distro=jessie',
    );
    const amd64Identity = createPurlIdentity(
      'pkg:deb/debian/curl@7.50.3-1?arch=amd64&distro=jessie',
    );

    assert.deepEqual(i386Identity, {
      rawPurl: 'pkg:deb/debian/curl@7.50.3-1?arch=i386&distro=jessie',
      canonicalComponentPurl: 'pkg:deb/debian/curl?arch=i386&distro=jessie',
      canonicalVersionPurl:
        'pkg:deb/debian/curl@7.50.3-1?arch=i386&distro=jessie',
    });
    assert.deepEqual(amd64Identity, {
      rawPurl: 'pkg:deb/debian/curl@7.50.3-1?arch=amd64&distro=jessie',
      canonicalComponentPurl: 'pkg:deb/debian/curl?arch=amd64&distro=jessie',
      canonicalVersionPurl:
        'pkg:deb/debian/curl@7.50.3-1?arch=amd64&distro=jessie',
    });
    assert.notEqual(
      i386Identity.canonicalComponentPurl,
      amd64Identity.canonicalComponentPurl,
    );
  });

  test('preserves required Conan qualifiers in versionless component identity', () => {
    assert.doesNotThrow(() =>
      createPurlIdentity(
        'pkg:conan/conan-center/openssl@1.1.1?user=conan&channel=stable',
        () => {
          throw new Error('boom');
        },
      ),
    );

    assert.deepEqual(
      createPurlIdentity(
        'pkg:conan/conan-center/openssl@1.1.1?user=conan&channel=stable',
      ),
      {
        rawPurl:
          'pkg:conan/conan-center/openssl@1.1.1?user=conan&channel=stable',
        canonicalComponentPurl:
          'pkg:conan/conan-center/openssl?channel=stable&user=conan',
        canonicalVersionPurl:
          'pkg:conan/conan-center/openssl@1.1.1?channel=stable&user=conan',
        legacyComponentPurl:
          'pkg:conan/conan-center/openssl?user=conan&channel=stable',
      },
    );
  });

  test('preserves subpath when version is removed from component identity', () => {
    assert.deepEqual(
      createPurlIdentity(
        'pkg:npm/%40scope/pkg@1.0.0?repository_url=https://example.com/repo#/dist/file.js',
      ),
      {
        rawPurl:
          'pkg:npm/%40scope/pkg@1.0.0?repository_url=https://example.com/repo#/dist/file.js',
        canonicalComponentPurl:
          'pkg:npm/%40scope/pkg?repository_url=https%3A%2F%2Fexample.com%2Frepo#dist/file.js',
        canonicalVersionPurl:
          'pkg:npm/%40scope/pkg@1.0.0?repository_url=https%3A%2F%2Fexample.com%2Frepo#dist/file.js',
        legacyComponentPurl:
          'pkg:npm/%40scope/pkg?repository_url=https://example.com/repo#/dist/file.js',
      },
    );
  });

  test('preserves raw qualifiers for versionless component legacy identity', () => {
    assert.deepEqual(
      createPurlIdentity(
        'pkg:conan/conan-center/openssl?user=conan&channel=stable',
        () => {
          throw new Error('boom');
        },
      ),
      {
        rawPurl: 'pkg:conan/conan-center/openssl?user=conan&channel=stable',
        canonicalComponentPurl:
          'pkg:conan/conan-center/openssl?channel=stable&user=conan',
        legacyComponentPurl:
          'pkg:conan/conan-center/openssl?user=conan&channel=stable',
      },
    );
  });

  test('normalizes a bare-major Go version without invoking type validators', () => {
    const calls: Array<{ purl: string; error: unknown }> = [];
    assert.deepEqual(
      createPurlIdentity('pkg:go/github.com/foo/bar@v1', (purl, error) => {
        calls.push({ purl, error });
      }),
      {
        rawPurl: 'pkg:go/github.com/foo/bar@v1',
        canonicalComponentPurl: 'pkg:golang/github.com/foo/bar',
        canonicalVersionPurl: 'pkg:golang/github.com/foo/bar@v1',
        legacyComponentPurl: 'pkg:go/github.com/foo/bar',
      },
    );
    assert.equal(calls.length, 0);
  });

  test('swallows throwing callbacks without breaking identity creation', () => {
    assert.doesNotThrow(() =>
      createPurlIdentity('pkg:go/github.com/foo/bar@v1', () => {
        throw new Error('boom');
      }),
    );
  });

  test('keeps encoded npm canonical identity idempotent across raw and pre-encoded scoped inputs', () => {
    const rawIdentity = createPurlIdentity('pkg:npm/@Angular/Core@15.0.0');
    const encodedIdentity = createPurlIdentity(
      'pkg:npm/%40angular/core@15.0.0',
    );

    assert.deepEqual(rawIdentity, {
      rawPurl: 'pkg:npm/@Angular/Core@15.0.0',
      canonicalComponentPurl: 'pkg:npm/%40angular/core',
      canonicalVersionPurl: 'pkg:npm/%40angular/core@15.0.0',
      legacyComponentPurl: 'pkg:npm/@Angular/Core',
    });
    assert.deepEqual(encodedIdentity, {
      rawPurl: 'pkg:npm/%40angular/core@15.0.0',
      canonicalComponentPurl: 'pkg:npm/%40angular/core',
      canonicalVersionPurl: 'pkg:npm/%40angular/core@15.0.0',
    });
    assert.equal(
      rawIdentity.canonicalComponentPurl,
      encodedIdentity.canonicalComponentPurl,
    );
    assert.equal(
      rawIdentity.canonicalVersionPurl,
      encodedIdentity.canonicalVersionPurl,
    );
  });

  test('does not apply extra pypi normalization beyond packageurl-js canonical output', () => {
    assert.deepEqual(createPurlIdentity('pkg:pypi/my-package@1.0.0'), {
      rawPurl: 'pkg:pypi/my-package@1.0.0',
      canonicalComponentPurl: 'pkg:pypi/my-package',
      canonicalVersionPurl: 'pkg:pypi/my-package@1.0.0',
    });
  });

  test('does not apply extra pub normalization beyond packageurl-js canonical output', () => {
    assert.deepEqual(createPurlIdentity('pkg:pub/my_package@1.0.0'), {
      rawPurl: 'pkg:pub/my_package@1.0.0',
      canonicalComponentPurl: 'pkg:pub/my_package',
      canonicalVersionPurl: 'pkg:pub/my_package@1.0.0',
    });
  });
});

describe('canonicalizeVersionFilter', () => {
  test('returns undefined for an undefined filter', () => {
    assert.equal(canonicalizeVersionFilter(undefined), undefined);
  });

  test('canonicalizes context and result purls with exact output', () => {
    assert.deepEqual(
      canonicalizeVersionFilter({
        contextPurls: [
          'pkg:nuget/Serilog.Sinks.Console@2.1.0',
          'pkg:go/github.com/foo/bar@v1.0.0',
        ],
        resultPurls: [
          'pkg:composer/Foo/Bar@1.0.0',
          'pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0',
        ],
      }),
      {
        contextPurls: [
          'pkg:nuget/serilog.sinks.console@2.1.0',
          'pkg:golang/github.com/foo/bar@v1.0.0',
        ],
        resultPurls: [
          'pkg:composer/foo/bar@1.0.0',
          'pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0',
        ],
      },
    );
  });

  test('preserves additional filter fields while canonicalizing purl arrays', () => {
    assert.deepEqual(
      canonicalizeVersionFilter({
        contextPurls: ['pkg:cargo/MyLib@0.1.0'],
        source: 'reconcile',
      }),
      { contextPurls: ['pkg:cargo/mylib@0.1.0'], source: 'reconcile' },
    );
  });
});

describe('normalizePurlIdentity', () => {
  // --- Preserve-version canonical output matrix: exact expected strings ---

  describe('preserve-version type alias translation', () => {
    test('go maps to golang — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:go/github.com/foo/bar@v1.0.0'),
        'pkg:golang/github.com/foo/bar@v1.0.0',
      );
    });

    test('rubygems maps to gem — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:rubygems/rails@7.0.0'),
        'pkg:gem/rails@7.0.0',
      );
    });

    test('golang is not re-aliased — idempotent', () => {
      assert.equal(
        normalizePurlIdentity('pkg:golang/github.com/foo/bar@v1.0.0'),
        'pkg:golang/github.com/foo/bar@v1.0.0',
      );
    });

    test('gem is not re-aliased — idempotent', () => {
      assert.equal(
        normalizePurlIdentity('pkg:gem/rails@7.0.0'),
        'pkg:gem/rails@7.0.0',
      );
    });

    test('npm type is not aliased — passes through unchanged', () => {
      assert.equal(
        normalizePurlIdentity('pkg:npm/lodash@4.17.21'),
        'pkg:npm/lodash@4.17.21',
      );
    });
  });

  describe('preserve-version ecosystem case normalization', () => {
    test('nuget name is lowercased — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:nuget/Serilog.Sinks.Console@2.1.0'),
        'pkg:nuget/serilog.sinks.console@2.1.0',
      );
    });

    test('composer namespace and name are lowercased — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:composer/Foo/Bar@1.0.0'),
        'pkg:composer/foo/bar@1.0.0',
      );
    });

    test('cargo name is lowercased — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:cargo/MyLib@0.1.0'),
        'pkg:cargo/mylib@0.1.0',
      );
    });

    test('npm percent-encoded scoped name is lowercased — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:npm/%40Angular/Core@15.0.0'),
        'pkg:npm/%40angular/core@15.0.0',
      );
    });

    test('npm raw scoped name is percent-encoded and lowercased — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:npm/@angular/core@15.0.0'),
        'pkg:npm/%40angular/core@15.0.0',
      );
    });
  });

  describe('preserve-version case-sensitive types preserved', () => {
    test('maven groupId and artifactId are byte-unchanged — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity(
          'pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0',
        ),
        'pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0',
      );
    });

    test('golang namespace path is byte-unchanged — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:golang/github.com/BurntSushi/toml@v0.4.1'),
        'pkg:golang/github.com/BurntSushi/toml@v0.4.1',
      );
    });

    test('multi-segment golang path is byte-unchanged — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:golang/github.com/Foo/Bar/Baz@v1.0.0'),
        'pkg:golang/github.com/Foo/Bar/Baz@v1.0.0',
      );
    });

    test('rubygems alias applies but gem name is byte-unchanged — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:rubygems/ActiveSupport@7.0.0'),
        'pkg:gem/ActiveSupport@7.0.0',
      );
    });
  });

  describe('preserve-version version value handling', () => {
    test('version with mixed case is not case-folded — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:nuget/serilog@2.0.0-Beta3'),
        'pkg:nuget/serilog@2.0.0-Beta3',
      );
    });

    test('version with +build metadata preserves value — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:maven/g/a@1.0.0+build5'),
        'pkg:maven/g/a@1.0.0+build5',
      );
    });

    test('versionless PURL is accepted — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:nuget/Serilog'),
        'pkg:nuget/serilog',
      );
    });

    test('go bare-major version is preserved without invoking type validators', () => {
      assert.equal(
        normalizePurlIdentity('pkg:go/github.com/foo/bar@v1'),
        'pkg:golang/github.com/foo/bar@v1',
      );
    });
  });

  describe('preserve-version qualifier and subpath parsing', () => {
    test('@ inside a qualifier value is not treated as the version separator', () => {
      assert.equal(
        normalizePurlIdentity(
          'pkg:npm/foo@1.0.0?vcs_url=git@github.com/x/y.git',
        ),
        'pkg:npm/foo@1.0.0?vcs_url=git%40github.com%2Fx%2Fy.git',
      );
    });

    test('@ inside qualifier value is idempotent — normalize twice returns equal', () => {
      const input = 'pkg:npm/foo@1.0.0?vcs_url=git@github.com/x/y.git';
      const once = normalizePurlIdentity(input);
      assert.equal(normalizePurlIdentity(once), once);
    });

    test('# in subpath is parsed correctly — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:npm/foo@1.0.0#path@x'),
        'pkg:npm/foo@1.0.0#path%40x',
      );
    });

    test('# in subpath is idempotent — normalize twice returns equal', () => {
      const input = 'pkg:npm/foo@1.0.0#path@x';
      const once = normalizePurlIdentity(input);
      assert.equal(normalizePurlIdentity(once), once);
    });
  });

  describe('omit-version canonical output', () => {
    test('removes only version from Swift while keeping namespace and name', () => {
      assert.equal(
        normalizePurlIdentity(
          'pkg:swift/github.com/apple/swift-argument-parser@1.2.3',
          { version: 'omit' },
        ),
        'pkg:swift/github.com/apple/swift-argument-parser',
      );
    });

    test('preserves Conan qualifiers when version is omitted', () => {
      assert.equal(
        normalizePurlIdentity(
          'pkg:conan/conan-center/openssl@1.1.1?user=conan&channel=stable',
          { version: 'omit' },
        ),
        'pkg:conan/conan-center/openssl?channel=stable&user=conan',
      );
    });

    test('preserves Debian qualifiers when version is omitted', () => {
      assert.equal(
        normalizePurlIdentity(
          'pkg:deb/debian/curl@7.50.3-1?arch=i386&distro=jessie',
          { version: 'omit' },
        ),
        'pkg:deb/debian/curl?arch=i386&distro=jessie',
      );
    });

    test('preserves npm subpath and qualifiers when version is omitted', () => {
      assert.equal(
        normalizePurlIdentity(
          'pkg:npm/%40scope/pkg@1.0.0?repository_url=https://example.com/repo#/dist/file.js',
          { version: 'omit' },
        ),
        'pkg:npm/%40scope/pkg?repository_url=https%3A%2F%2Fexample.com%2Frepo#dist/file.js',
      );
    });
  });

  describe('idempotency', () => {
    const idempotentCases: Array<[string, string]> = [
      ['pkg:nuget/Serilog.Sinks.Console@2.1.0', 'nuget mixed case'],
      ['pkg:composer/Foo/Bar@1.0.0', 'composer mixed case'],
      ['pkg:cargo/MyLib@0.1.0', 'cargo mixed case'],
      ['pkg:npm/@angular/core@15.0.0', 'npm raw @'],
      ['pkg:go/github.com/foo/bar@v1.0.0', 'go→golang alias'],
      ['pkg:rubygems/rails@7.0.0', 'rubygems→gem alias'],
      ['pkg:golang/github.com/BurntSushi/toml@v0.4.1', 'golang preserved'],
      ['pkg:gem/rails@7.0.0', 'gem direct'],
      ['pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0', 'maven preserved'],
      ['pkg:pypi/requests@2.28.0', 'pypi'],
      ['pkg:npm/foo@1.0.0?vcs_url=git@github.com/x/y.git', 'qualifier with @'],
      ['pkg:npm/foo@1.0.0#path@x', 'subpath with #@'],
    ];

    for (const [input, label] of idempotentCases) {
      test(`preserve-version idempotent for ${label}`, () => {
        const once = normalizePurlIdentity(input);
        assert.equal(normalizePurlIdentity(once), once);
      });
    }
  });

  describe('unparseable PURL passthrough — returns input unchanged, never throws', () => {
    test('string not starting with pkg: is returned unchanged', () => {
      assert.equal(normalizePurlIdentity('not-a-purl'), 'not-a-purl');
    });

    test('malformed pkg: input is returned unchanged', () => {
      assert.equal(normalizePurlIdentity('pkg:'), 'pkg:');
    });

    test('no exception for non-PURL input', () => {
      assert.doesNotThrow(() => normalizePurlIdentity('not-a-purl'));
    });

    test('no exception for malformed pkg: input', () => {
      assert.doesNotThrow(() => normalizePurlIdentity('pkg:'));
    });
  });

  describe('percent-encoded slash inside a segment is preserved', () => {
    test('nuget %2F inside name stays encoded and uppercase-hex — exact canonical output', () => {
      assert.equal(
        normalizePurlIdentity('pkg:nuget/Foo%2FBar@1.0.0'),
        'pkg:nuget/foo%2Fbar@1.0.0',
      );
    });
  });

  describe('onUncanonicalized observability hook', () => {
    test('hook does NOT fire on parse failure — non-PURL input', () => {
      let callCount = 0;
      normalizePurlIdentity('not-a-purl', {
        version: 'preserve',
        onUncanonicalized: () => {
          callCount++;
        },
      });
      assert.equal(callCount, 0);
    });

    test('hook does NOT fire on success — nuget canonical output', () => {
      let callCount = 0;
      const result = normalizePurlIdentity('pkg:nuget/Serilog@1.0.0', {
        version: 'preserve',
        onUncanonicalized: () => {
          callCount++;
        },
      });
      assert.equal(callCount, 0);
      assert.equal(result, 'pkg:nuget/serilog@1.0.0');
    });

    test('a callback that itself throws never breaks the identity path', () => {
      assert.doesNotThrow(() => {
        const result = normalizePurlIdentity('pkg:go/github.com/foo/bar@v1', {
          version: 'preserve',
          onUncanonicalized: () => {
            throw new Error('boom');
          },
        });
        assert.equal(result, 'pkg:golang/github.com/foo/bar@v1');
      });
    });
  });
});
