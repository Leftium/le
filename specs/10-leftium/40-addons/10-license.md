# `license` add-on

The `license` add-on ensures that a project has the selected license file.

It is the first reference add-on because it tests preset selection, file creation, conflict handling, and idempotency without requiring framework detection or structured configuration merges.

## Command

```sh
le add license
le add license --preset mit
```

The v0 default is `mit`. Obtain author and year values from explicit CLI input, then suitable project or Git metadata. If a required value remains ambiguous, prompt interactively or fail with instructions in non-interactive mode.

## Behavior

Inspect conventional existing license filenames, including `LICENSE` and `LICENSE.md`, before creating a license file at the selected package root. In a workspace, report an ancestor license and require an explicit package-level choice before adding a potentially competing license; do not modify the ancestor implicitly. Do not create a duplicate when an equivalent alternate file exists; multiple inconsistent files are a conflict. Distinguish a missing file, an equivalent license, a different recognizable license, and customized or unrecognized text.

Create a missing file and leave an equivalent file unchanged. Do not replace a different or customized license without explicit confirmation or a force option.

Update package metadata automatically only when its license field is absent or equivalent. Report disagreement between the selected/file license and package metadata; changing a conflicting value requires explicit confirmation or a force option. Preserve unrelated metadata. Detailed license-compatibility analysis is outside v0.

## Verification

Fixture tests must cover creation, an idempotent second run, explicit and detected metadata, conflicting licenses, customized text, alternate filenames, multiple license files, file/metadata disagreement, and package metadata preservation.
