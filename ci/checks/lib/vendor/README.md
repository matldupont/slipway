# Vendored: one YAML parser

`js-yaml.mjs` is a third-party file, kept here so the checks read workflow files as YAML with nothing installed
(decisions.md, D-033). It is never edited. `js-yaml.LICENSE` is its licence (MIT), which travels with it.

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

## What was checked, and what was not

- The tarball's sha512 equals the registry's integrity value. Both come from the registry.
- The tag exists upstream at the commit the registry names for this version.
- The built file's whole change from 5.4.1 is its version banner and one line, and that line is the upstream
  source change between the two tags (`src/ast/styler_defaults.ts`).
- The file was read as text before it was first run: no `import`, `require`, `eval`, `Function`, `process`,
  `fetch`, timer or `node:` module in it.
- **Not checked:** the built file against its source, byte for byte. Upstream does not keep the built file in its
  repository, and the release has no npm provenance attestation.

## What the parser is not

It is stricter than common YAML readers about a closing bracket, or a later line of a quoted text, at its
key's indentation, and it reads nothing nested deeper than 100. It is not strict everywhere: it reads some
texts a stricter reader rejects. `ci/checks/lib/workflow-yaml.mjs` refuses the forms listed and tested, and is
not a complete defence; D-033 states the rest as a limit.

## Moving the pin

Only by the rule in D-033: to a published release at least 14 days old, with the checks above run again, in a
pull request that replaces this file whole, moves the hash and this table, and changes nothing else.
`ci/checks/lib/workflow-yaml.mjs` is the only file that imports the parser.
