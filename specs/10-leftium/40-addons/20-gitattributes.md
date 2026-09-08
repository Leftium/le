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

- `nodiff` keeps machine-generated files as normalized text while hiding their contents from ordinary diffs. Initial rules should cover common lockfiles; select the diff attribute through the experiment below.
- `eol` establishes the project's general text and line-ending policy, normally `* text=auto eol=lf`.

Candidates such as `binary` and `linguist` may be added later. A built-in `leftium` composite may combine the preferred purpose-specific presets rather than duplicate their rules.

The root here is the repository root, detected from Git or explicitly selected as described in [project detection](../30-cli.md#project-detection). Resolve override paths relative to that root. File generation alone does not require Git initialization; a preset needing local Git settings must explain that prerequisite before mutation.

## Git configuration

Before choosing a representation, compare `package-lock.json text eol=lf -diff` with a custom `diff=nodiff` driver in a disposable Git fixture. Inspect ordinary diff output and the intended review tools, text normalization, clone portability, and repeated application.

Prefer native `-diff` if its binary-change summary provides acceptable suppression of textual hunks. Retain a custom driver only for a demonstrated presentation requirement that native attributes cannot meet. Record the observed behavior and selected representation in this spec before shipping; a custom driver is not an architectural requirement.

If a custom driver is selected, establish only project-local Git settings, preserve existing custom drivers or report a conflict, and document setup after cloning. Detect missing Git prerequisites before avoidable mutation. File generation without Git remains possible for presets that do not need local settings. Do not claim complete setup if required settings or verification failed.

## Presets and overrides

Each leaf preset is ordinary `.gitattributes` content. Composite presets are ordered lists of presets. Leftium resolves the list, detects cycles, and concatenates rules deterministically.

The native syntax is already compact and readable. Wrapping every rule in a Leftium JSON or TypeScript schema would add ceremony without adding meaning.

A project may add native-format rules in `.leftium/gitattributes.override`. Overrides are applied after presets; Leftium must not invent a second schema for Git attributes.

## File ownership

Use a clearly marked generated block even in a newly created `.gitattributes`. Preserve existing user rules outside it. The block is replaceable output: direct edits inside it are regenerated without historical edit detection. Its comment must direct custom rules to `.leftium/gitattributes.override` or outside the block. Equivalent rules must not accumulate. Malformed or duplicate markers require an explanation before writing.

Conflicting rules require an explanation. Resolve them only when precedence is deterministic and the result is shown; otherwise stop before writing.

Generated content should name the selected presets and the command that refreshes it.

## Verification

Fixture tests must cover leaf presets, composition order, cycles, overrides, existing user content, conflicts, replacement of manually edited generated blocks, malformed markers, and an idempotent second run.
