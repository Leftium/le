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

The add-on writes the conventional license file at the repository root. It must distinguish a missing file, an equivalent license, a different recognizable license, and customized or unrecognized text.

Create a missing file and leave an equivalent file unchanged. Do not replace a different or customized license without explicit confirmation or a force option.

Package metadata may be updated only when its license field is absent or equivalent. Preserve unrelated metadata. Detailed license-compatibility analysis is outside v0.

## Verification

Fixture tests must cover creation, an idempotent second run, explicit and detected metadata, conflicting licenses, customized text, and package metadata preservation.
