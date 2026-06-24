import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { deriveComponentStatus, canonicalizePurl } from './utils.ts';
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

describe('canonicalizePurl', () => {
  // --- Canonical output matrix: exact expected strings ---
  // Each assertion pins the literal output produced by the library-based implementation.
  // Each assertion pins the exact output; a change in alias, case, or encoding fails a concrete string comparison.

  describe('type alias translation', () => {
    test('go maps to golang — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:go/github.com/foo/bar@v1.0.0'),
        'pkg:golang/github.com/foo/bar@v1.0.0',
      );
    });

    test('rubygems maps to gem — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:rubygems/rails@7.0.0'),
        'pkg:gem/rails@7.0.0',
      );
    });

    test('golang is not re-aliased — idempotent', () => {
      assert.equal(
        canonicalizePurl('pkg:golang/github.com/foo/bar@v1.0.0'),
        'pkg:golang/github.com/foo/bar@v1.0.0',
      );
    });

    test('gem is not re-aliased — idempotent', () => {
      assert.equal(
        canonicalizePurl('pkg:gem/rails@7.0.0'),
        'pkg:gem/rails@7.0.0',
      );
    });

    test('npm type is not aliased — passes through unchanged', () => {
      assert.equal(
        canonicalizePurl('pkg:npm/lodash@4.17.21'),
        'pkg:npm/lodash@4.17.21',
      );
    });
  });

  // --- Case matrix: lowercased types ---

  describe('ecosystem case normalization — lowercased allowlist', () => {
    test('nuget name is lowercased — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:nuget/Serilog.Sinks.Console@2.1.0'),
        'pkg:nuget/serilog.sinks.console@2.1.0',
      );
    });

    test('composer namespace and name are lowercased — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:composer/Foo/Bar@1.0.0'),
        'pkg:composer/foo/bar@1.0.0',
      );
    });

    test('cargo name is lowercased — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:cargo/MyLib@0.1.0'),
        'pkg:cargo/mylib@0.1.0',
      );
    });

    test('npm percent-encoded scoped name is lowercased — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:npm/%40Angular/Core@15.0.0'),
        'pkg:npm/%40angular/core@15.0.0',
      );
    });

    test('npm raw scoped name is percent-encoded and lowercased — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:npm/@angular/core@15.0.0'),
        'pkg:npm/%40angular/core@15.0.0',
      );
    });
  });

  // --- Case matrix: case-preserved types ---

  describe('ecosystem case normalization — case-sensitive types preserved', () => {
    test('maven groupId and artifactId are byte-unchanged — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0'),
        'pkg:maven/org.Apache.Commons/commons-Lang3@3.12.0',
      );
    });

    test('golang namespace path is byte-unchanged — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:golang/github.com/BurntSushi/toml@v0.4.1'),
        'pkg:golang/github.com/BurntSushi/toml@v0.4.1',
      );
    });

    test('multi-segment golang path is byte-unchanged — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:golang/github.com/Foo/Bar/Baz@v1.0.0'),
        'pkg:golang/github.com/Foo/Bar/Baz@v1.0.0',
      );
    });

    test('rubygems alias applies but gem name is byte-unchanged — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:rubygems/ActiveSupport@7.0.0'),
        'pkg:gem/ActiveSupport@7.0.0',
      );
    });
  });

  // --- Version value preservation ---

  describe('version value preservation', () => {
    test('version with mixed case is not case-folded — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:nuget/serilog@2.0.0-Beta3'),
        'pkg:nuget/serilog@2.0.0-Beta3',
      );
    });

    test('version with +build metadata preserves value — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:maven/g/a@1.0.0+build5'),
        'pkg:maven/g/a@1.0.0+build5',
      );
    });

    test('versionless PURL is accepted — exact canonical output', () => {
      assert.equal(canonicalizePurl('pkg:nuget/Serilog'), 'pkg:nuget/serilog');
    });
  });

  // --- Qualifier and subpath parsing edges ---

  describe('qualifier and subpath parsing', () => {
    test('@ inside a qualifier value is not treated as the version separator — version is 1.0.0, qualifier canonically re-encoded', () => {
      // The version is isolated as "1.0.0"; the @ in git@github.com belongs to the
      // qualifier value, which the serializer re-encodes: git@github.com → git%40github.com%2Fx%2Fy.git
      assert.equal(
        canonicalizePurl('pkg:npm/foo@1.0.0?vcs_url=git@github.com/x/y.git'),
        'pkg:npm/foo@1.0.0?vcs_url=git%40github.com%2Fx%2Fy.git',
      );
    });

    test('@ inside qualifier value is idempotent — canonicalize twice returns equal', () => {
      const input = 'pkg:npm/foo@1.0.0?vcs_url=git@github.com/x/y.git';
      const once = canonicalizePurl(input);
      assert.equal(canonicalizePurl(once), once);
    });

    test('# in subpath is parsed correctly — exact canonical output', () => {
      // The subpath @ is re-encoded by the serializer: path@x → path%40x
      assert.equal(
        canonicalizePurl('pkg:npm/foo@1.0.0#path@x'),
        'pkg:npm/foo@1.0.0#path%40x',
      );
    });

    test('# in subpath is idempotent — canonicalize twice returns equal', () => {
      const input = 'pkg:npm/foo@1.0.0#path@x';
      const once = canonicalizePurl(input);
      assert.equal(canonicalizePurl(once), once);
    });
  });

  // --- pypi: not double-applied ---

  describe('pypi passes through case normalization unchanged', () => {
    test('pypi name is byte-identical to input — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:pypi/requests@2.28.0'),
        'pkg:pypi/requests@2.28.0',
      );
    });
  });

  // --- Idempotency ---

  describe('idempotency — canonicalize(canonicalize(x)) === canonicalize(x)', () => {
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
      test(`idempotent for ${label}`, () => {
        const once = canonicalizePurl(input);
        assert.equal(canonicalizePurl(once), once);
      });
    }
  });

  // --- Unparseable passthrough ---

  describe('unparseable PURL passthrough — returns input unchanged, never throws', () => {
    test('string not starting with pkg: is returned unchanged', () => {
      assert.equal(canonicalizePurl('not-a-purl'), 'not-a-purl');
    });

    test('malformed pkg: input is returned unchanged', () => {
      assert.equal(canonicalizePurl('pkg:'), 'pkg:');
    });

    test('no exception for non-PURL input', () => {
      assert.doesNotThrow(() => canonicalizePurl('not-a-purl'));
    });

    test('no exception for malformed pkg: input', () => {
      assert.doesNotThrow(() => canonicalizePurl('pkg:'));
    });

    // A bare-major Go version (@v1, not full semver) is not serializable by the
    // pinned packageurl-js, so the input passes through unchanged and is not aliased.
    test('go-typed PURL with a bare-major version (@v1) does not throw', () => {
      assert.doesNotThrow(() =>
        canonicalizePurl('pkg:go/github.com/foo/bar@v1'),
      );
    });

    test('go-typed PURL with a bare-major version (@v1) returns input unchanged', () => {
      assert.equal(
        canonicalizePurl('pkg:go/github.com/foo/bar@v1'),
        'pkg:go/github.com/foo/bar@v1',
      );
    });
  });

  // --- Encoded separator inside a segment is preserved ---

  describe('percent-encoded slash inside a segment is preserved', () => {
    test('nuget %2F inside name stays encoded and uppercase-hex — exact canonical output', () => {
      assert.equal(
        canonicalizePurl('pkg:nuget/Foo%2FBar@1.0.0'),
        'pkg:nuget/foo%2Fbar@1.0.0',
      );
    });
  });

  // --- onUncanonicalized observability hook ---
  // The hook fires ONLY in the serialize-failure branch (parsed OK, reconstruct threw).
  // It MUST NOT fire on parse failures or on success. The function never throws even
  // when the callback itself throws.

  describe('onUncanonicalized observability hook', () => {
    // A golang bare-major version (@v1) parses OK but fails to serialize under
    // the packageurl-js golang validator — the canonical serialize-failure scenario.
    const serializeFailurePurl = 'pkg:go/github.com/foo/bar@v1';

    test('hook fires exactly once on serialize failure, receives input purl and an error', () => {
      let callCount = 0;
      let receivedPurl: string | undefined;
      let receivedError: unknown;

      canonicalizePurl(serializeFailurePurl, (purl, error) => {
        callCount++;
        receivedPurl = purl;
        receivedError = error;
      });

      assert.equal(callCount, 1);
      assert.equal(receivedPurl, serializeFailurePurl);
      assert.ok(receivedError instanceof Error);
    });

    test('return value on serialize failure is the input unchanged', () => {
      const result = canonicalizePurl(serializeFailurePurl, () => {});
      assert.equal(result, serializeFailurePurl);
    });

    test('hook does NOT fire on parse failure — non-PURL input', () => {
      let callCount = 0;
      canonicalizePurl('not-a-purl', () => {
        callCount++;
      });
      assert.equal(callCount, 0);
    });

    test('hook does NOT fire on parse failure — malformed pkg: input', () => {
      let callCount = 0;
      canonicalizePurl('pkg:', () => {
        callCount++;
      });
      assert.equal(callCount, 0);
    });

    test('hook does NOT fire on success — nuget canonical output', () => {
      let callCount = 0;
      const result = canonicalizePurl('pkg:nuget/Serilog@1.0.0', () => {
        callCount++;
      });
      assert.equal(callCount, 0);
      assert.equal(result, 'pkg:nuget/serilog@1.0.0');
    });

    test('backward compatible — no callback, serialize failure, does not throw', () => {
      assert.doesNotThrow(() => canonicalizePurl(serializeFailurePurl));
    });

    test('backward compatible — no callback, serialize failure, returns input unchanged', () => {
      assert.equal(
        canonicalizePurl(serializeFailurePurl),
        serializeFailurePurl,
      );
    });

    test('a callback that itself throws does not propagate — function does not throw', () => {
      assert.doesNotThrow(() => {
        canonicalizePurl(serializeFailurePurl, () => {
          throw new Error('boom');
        });
      });
    });

    test('a callback that itself throws does not break identity — return value is input unchanged', () => {
      const result = canonicalizePurl(serializeFailurePurl, () => {
        throw new Error('boom');
      });
      assert.equal(result, serializeFailurePurl);
    });
  });
});
