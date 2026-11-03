# Vendored: two parsers

Two third-party files, kept here so the checks read text with nothing installed. Neither is ever edited, and each
licence travels with its file.

- `js-yaml.mjs` reads workflow files as YAML (decisions.md, D-033). Its licence is `js-yaml.LICENSE` (MIT).
- `babel-parser.mjs` reads JavaScript and TypeScript for the tests-can-fail step (decisions.md, D-037). The
  step's spec is `dev/features/tests-can-fail.md` §2. Its licence is `babel-parser.LICENSE` (MIT).

## js-yaml

| | |
|---|---|
| Package | `js-yaml`, from registry.npmjs.org |
| Version | 5.4.2, published 2026-09-13. Fetched 2026-10-07, when the registry's `latest` was 5.4.3 (published 2026-10-05, two days old: not taken) |
| Tarball | `https://registry.npmjs.org/js-yaml/-/js-yaml-5.4.2.tgz` |
| Tarball integrity | `sha512-m+aqu+LwO1O6sIopafj8HUVl5aawITwZQe/yHpMCKjaWBaA/d07B/QdMb3529REftiU+RMMHL3Vlsw3hON7vWg==`, equal to the registry's |
| File kept | `package/dist/js-yaml.mjs` → `js-yaml.mjs`, 128,860 bytes |
| File sha256 | `86ac62558d7cd103ff5f5a10a885ebecc04c23ca2f1487522864b49221edc25c`, pinned by `scripts/workflow-yaml.test.mjs` |
| Licence kept | `package/LICENSE` → `js-yaml.LICENSE`, sha256 `a07bc24468b9654ce76a547d47a2db282d07733b715db4c73a98bd63961f9550` |
| Upstream | https://github.com/nodeca/js-yaml, tag `5.4.2` at commit `494400bd45cad078123cfc057e674a9a0a8d9983`, the commit the registry names |

### What was checked, and what was not

- The tarball's sha512 equals the registry's integrity value. Both come from the registry.
- The tag exists upstream at the commit the registry names for this version.
- The built file's whole change from 5.4.1 is its version banner and one line, and that line is the upstream
  source change between the two tags (`src/ast/styler_defaults.ts`).
- The file was read as text before it was first run: no `import`, `require`, `eval`, `Function`, `process`,
  `fetch`, timer or `node:` module in it.
- **Not checked:** the built file against its source, byte for byte. Upstream does not keep the built file in its
  repository, and the release has no npm provenance attestation.

### What the parser is not

It is stricter than common YAML readers about a closing bracket, or a later line of a quoted text, at its
key's indentation, and it reads nothing nested deeper than 100. It is not strict everywhere: it reads some
texts a stricter reader rejects. `ci/checks/lib/workflow-yaml.mjs` refuses the forms listed and tested, and is
not a complete defence; D-033 states the rest as a limit.

### Moving the pin

Only by the rule in D-033: to a published release at least 14 days old, with the checks above run again, in a
pull request that replaces this file whole, moves the hash and this table, and changes nothing else.
`ci/checks/lib/workflow-yaml.mjs` is the only file that imports the parser.

## @babel/parser

| | |
|---|---|
| Package | `@babel/parser`, from registry.npmjs.org |
| Version | 8.0.7, published 2026-10-07. Fetched 2026-11-03, when the registry's `latest` was 8.1.0 (published 2026-11-02); 8.1.0, 8.0.10 (2026-10-29) and 8.0.8 (2026-10-23) were under 14 days old: not taken. The 7.x line's later releases (7.29.11, 7.29.12) are older code and were not considered |
| Tarball | `https://registry.npmjs.org/@babel/parser/-/parser-8.0.7.tgz` |
| Tarball integrity | `sha512-UkDwEbPO1px2JQSrdh4qIgaH1JgG7GO/pFeJkpxhDxIETkT/QvGpnigXIw75ViHYPtIgKITmVUJqLjiO+JuWjA==`, equal to the registry's |
| File kept | `package/lib/index.js` → `babel-parser.mjs`, 481,458 bytes. The package is `"type": "module"`, so the file is an ES module as published |
| File sha256 | `7d39f3039056b4e4e05daecd69c4391beeed1769429128a2ba3d3113dffe4072`, pinned by `scripts/mutants.test.mjs` |
| Licence kept | `package/LICENSE` → `babel-parser.LICENSE`, sha256 `2e97627cb278aa7556fb9e8817368302301a595b6c7582512b8d74c57b773652` |
| Upstream | https://github.com/babel/babel. The release's npm provenance names commit `c2e6b0701a09805b7f084fd01b088840e336dc99` on `main`, built by `.github/workflows/release.yml`; the tag `v8.0.7` is at commit `1fc00736614159e3b236b9958771f482899853f0` |

### What was checked, and what was not

- The tarball's sha512 equals the registry's integrity value, and the digest the release's provenance statement
  names for it.
- The file was read as text before it was first run: no `import` statement, `require`, `eval`, `Function`
  constructor, `globalThis`, `process`, `fetch`, timer or `node:` module in it. Its one `export` line gives
  `getColumn`, `getLine`, `parse`, `parseExpression` and `tokTypes`. The package lists `@babel/types` as a
  dependency; the file never imports it, so nothing else is vendored.
- The provenance statement names a commit on `main`, `c2e6b07`. The tag's commit, `1fc0073`, has it as its only
  parent and changes only the version lines of the packages' `package.json` files: the release bump.
- **Not checked:** the provenance statement's signature, and the built file against its source.

### Moving the pin

By js-yaml's rule (D-033), which the tests-can-fail decision applies here (D-037): only to a release at least 14
days old, with the checks above run again. That pull request replaces this file whole, moves the hash and this
table, and changes nothing else. No test checks a release's age: `scripts/mutants.test.mjs` holds the file to the
version this table records, and the review of that pull request checks the dates against the registry. `ci/checks/lib/mutants.mjs` (build step 2 of `dev/features/tests-can-fail.md`) is to be
the only file that imports the parser.
