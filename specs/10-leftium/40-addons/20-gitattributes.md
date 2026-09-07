# `gitattributes` add-on

The `gitattributes` add-on composes named presets into a deterministic root `.gitattributes` file while preserving project-specific rules.

Git attributes are a useful test of the preset model because several independent policies can share one ordered native file. Small presets such as `nodiff` and `eol` let users adopt one concern without accepting an opaque bundle of Leftium defaults.

## Command

```sh
le add gitattributes
le add gitattributes --preset nodiff
le add gitattributes --preset nodiff --preset eol
```

The exact default composition is provisional. v0 must include `nodiff` and `eol` as independently selectable presets:

- `nodiff` keeps machine-generated files as normalized text while hiding their contents from ordinary diffs. Initial rules should cover common lockfiles, for example `package-lock.json text eol=lf diff=nodiff`.
- `eol` establishes the project's general text and line-ending policy, normally `* text=auto eol=lf`.

Candidates such as `binary` and `linguist` may be added later. A built-in `leftium` composite may combine the preferred purpose-specific presets rather than duplicate their rules.

## Presets and overrides

Each leaf preset is ordinary `.gitattributes` content. Composite presets are ordered lists of presets. Leftium resolves the list, detects cycles, and concatenates rules deterministically.

The native syntax is already compact and readable. Wrapping every rule in a Leftium JSON or TypeScript schema would add ceremony without adding meaning.

A project may add native-format rules in `.leftium/gitattributes.override`. Overrides are applied after presets; Leftium must not invent a second schema for Git attributes.

## File ownership

If `.gitattributes` is absent, Leftium may generate it. If it contains user rules, preserve them and maintain a clearly marked generated block. Equivalent rules must not accumulate.

Conflicting rules require an explanation. Resolve them only when precedence is deterministic and the result is shown; otherwise stop before writing.

Generated content should name the selected presets and the command that refreshes it.

## Verification

Fixture tests must cover leaf presets, composition order, cycles, overrides, existing user content, conflicts, generated-block replacement, and an idempotent second run.
