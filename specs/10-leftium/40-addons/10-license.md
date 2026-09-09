# `license` add-on

The `license` add-on ensures that a project has the selected license file.

It is the first reference add-on because it tests preset selection, file creation, conflict handling, and idempotency without requiring framework detection or structured configuration merges.

## Command

```sh
le add license
le add license --preset mit
le add license --preset apache-2.0
```

Built-in presets are `mit` (`MIT`), `apache-2.0` (`Apache-2.0`), `bsd-3-clause` (`BSD-3-Clause`), and `isc` (`ISC`). The SPDX identifier is written to a package manifest when one exists. Interactive `le add license` opens a selector when `--preset` is omitted; explicit presets bypass it. Non-interactive omission retains the `mit` default.

MIT, BSD-3-Clause, and ISC obtain author and year from explicit CLI input, a canonical selected-license notice, package metadata, or Git configuration, then prompt only when necessary. Apache-2.0 has no substituted copyright notice in its canonical LICENSE text and must not prompt for either value.

## Behavior

Inspect conventional existing license filenames, including `LICENSE` and `LICENSE.md`, before creating a license file at the selected target directory. A package-level invocation should select that package directory explicitly. In a workspace, report an ancestor license and require an explicit package-level choice before adding a potentially competing license; do not modify the ancestor implicitly. Do not create a duplicate when an equivalent alternate file exists; multiple inconsistent files are a conflict. Distinguish a missing file, an equivalent license, a different recognizable license, and customized or unrecognized text.

Create a missing file and leave an equivalent file unchanged. Do not replace a different or customized license without explicit confirmation or a force option.

Update package metadata automatically only when its license field is absent or equivalent. Report disagreement between the selected/file license and package metadata; changing a conflicting value requires explicit confirmation or a force option. Preserve unrelated metadata. Detailed license-compatibility analysis is outside v0. Recognize the built-in texts sufficiently to distinguish a selected license, another supported preset, customized content, and inconsistent multiple license files.

## Verification

Fixture tests must cover creation, an idempotent second run, explicit and detected metadata, conflicting licenses, customized text, alternate filenames, multiple license files, file/metadata disagreement, and package metadata preservation.
