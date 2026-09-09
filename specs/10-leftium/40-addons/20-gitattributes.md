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

- `nodiff` keeps machine-generated files out of ordinary diff and difftool review by assigning `diff=nodiff` and configuring its driver locally. Initial rules cover npm, pnpm, Yarn, and Bun lockfiles. `bun.lock` remains text; `*.lockb` retains compatibility with Bun's older binary format.
- `eol` uses `* text=auto !eol`. Git detects text and normalizes it to LF in the repository while working-tree endings remain subject to Git configuration and platform defaults. Specific machine-file rules set `eol=lf` when their working-tree format must also be LF.

Candidates such as `binary` and `linguist` may be added later. A built-in `leftium` composite may combine the preferred purpose-specific presets rather than duplicate their rules.

The root here is the repository root, detected from Git or explicitly selected as described in [project detection](../30-cli.md#project-detection). Resolve override paths relative to that root. File generation alone does not require Git initialization; a preset needing local Git settings must explain that prerequisite before mutation.

## Git configuration

The `nodiff` preset uses this repository-local driver:

```gitconfig
diff.nodiff.command = f () { echo "Diff skipped: $1"; }; f "$1"
```

Before writing `.gitattributes`, Leftium requires a Git repository and reads every local value for `diff.nodiff.command`. No local value installs the driver. One exact value is current. Multiple values or any different value produce a conflict that shows the current and desired values without overwriting either scope. A compatible global value does not replace local setup because global configuration is not clone-portable.

### Experiment: 2026-09-09

A disposable repository committed a LF `package-lock.json`, then changed it with CRLF working-tree content. Native `-diff` produced Git's `Binary file modified (old: 45 B, new: 64 B)` summary in ordinary and staged diff. That experiment optimized for ordinary `git diff`, where native attributes were sufficient.

Later real-world evidence changed the requirement: the established review workflow uses `git difftool`, and `-diff` may still allow the lockfile path to reach that tool. A second disposable fixture assigned `diff=nodiff` and configured `diff.nodiff.command`. Both ordinary `git diff` and a deterministic command-based `git difftool` printed `Diff skipped: package-lock.json`; the configured difftool was not launched and lockfile content was not shown.

Both representations retain explicit `text eol=lf` semantics on text lockfiles. v0 therefore uses `diff=nodiff`: the custom driver satisfies the proven review workflow, while native `-diff` satisfies only the earlier, narrower ordinary-diff requirement.

The local driver is absent after cloning because `.git/config` is not tracked. The generated block names the regeneration command, and rerunning it repairs local configuration without changing tracked content. A first repair is `applied`; a subsequent fully current run is `no-op`.

Preflight configuration conflicts and Git availability before mutation. Install the driver before writing `.gitattributes`; if the file mutation fails, remove only a driver that this run installed. Report retained partial state if rollback fails. Presets such as `eol` that need no local setting remain available in plain directories.

### Deferred ownership boundary

The v0 `nodiff` gitattributes preset owns both the attribute and its required local driver so one successful command leaves the behavior usable. Revisit that coupling when Leftium has add-on composition. The preferred long-term shape is a gitattributes preset that owns only native attributes, a gitconfig preset that owns only the driver, and a user-facing `nodiff` add-on that composes both. Requiring two manual commands is acceptable only if partial setup is explicit; printing an optional follow-up command is not preferred because users commonly skip it.

## Presets and overrides

Each leaf preset is ordinary `.gitattributes` content. Composite presets are ordered lists of presets. Leftium resolves the list, detects cycles, removes duplicates, and renders broad `*` defaults before specific rules regardless of request order. Native overrides remain last.

The native syntax is already compact and readable. Wrapping every rule in a Leftium JSON or TypeScript schema would add ceremony without adding meaning.

A project may add native-format rules in `.leftium/gitattributes.override`. Overrides are applied after presets; Leftium must not invent a second schema for Git attributes.

## File ownership

Use a clearly marked generated block even in a newly created `.gitattributes`. Preserve existing user rules outside it. The block is replaceable output: direct edits inside it are regenerated without historical edit detection. Its comment must direct custom rules to `.leftium/gitattributes.override` or outside the block. Equivalent rules must not accumulate. Malformed or duplicate markers require an explanation before writing.

Conflicting rules require an explanation. Resolve them only when precedence is deterministic and the result is shown; otherwise stop before writing.

Generated content should name the selected presets and the command that refreshes it.

Results retain `changed` as the file-only compatibility field and report all mutations as structured effects. File effects name `.gitattributes`; Git-config effects name the local key without presenting `.git/config` as a tracked path. Any effect makes the result `applied`, including a post-clone run that installs only the local driver.

## Verification

Fixture tests must cover leaf presets, request-order-independent composition, attribute precedence, cycles, overrides, existing user content, conflicts, replacement of manually edited generated blocks, and an idempotent second run. Git fixtures must verify missing, exact, conflicting, and global-only driver states; missing Git or repository prerequisites before file mutation; actual `git diff` and deterministic `git difftool` suppression; and clone reapplication without tracked-file changes.
