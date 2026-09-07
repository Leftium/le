# Core model

This document defines the concepts shared by every Leftium add-on.

## Add-ons

An add-on knows how to add or maintain one capability or convention. Examples include `license`, `gitattributes`, `pages`, `prettier`, and `logo`.

An add-on owns the desired result and its validation. It does not require a particular implementation style. Depending on the domain, it may create or transform files, install packages, call an upstream tool, configure infrastructure, or reconcile existing configuration.

`le add` means "make this add-on's desired result true for the current project." It does not imply that Leftium must own every affected file.

Defining `add` by its result makes repeated use naturally idempotent and avoids separate "install" and "configure" commands for the same capability.

## Presets

A preset is named reusable configuration for one add-on. Presets use the add-on's native domain model instead of a universal Leftium schema.

Leftium may ship opinionated defaults, but those preferences belong in replaceable presets rather than add-on code. This keeps the add-ons useful to people who do not want Leftium's personal defaults.

```text
license:       mit
gitattributes: nodiff + eol
prettier:      default
logo:          default
```

A leaf preset contains native add-on configuration. A composite preset contains an ordered list of other presets. Composition is recursive; cycles are errors.

When several presets affect the same value, later presets win unless the add-on defines a safer domain-specific merge. A project override is applied after its presets.

An add-on preset configures one add-on. A future project preset may select and configure several add-ons, but project presets are outside v0.

A bare `le add <addon>` uses the effective default preset when one is configured. Defaults follow the normal scope precedence, so users can replace Leftium's built-in preferences without defining a new add-on.

Project-specific input is ordinary add-on configuration, not a separate kind of source. For example, `logo` may use a reusable preset or a custom project-local `LogoConfig`; `pages` mostly uses detected project configuration.

An override is a project-specific delta applied after presets. Not every add-on needs overrides.

## Dependencies

An add-on may depend on another add-on. Dependency resolution must be ordered, deduplicated, and cycle-safe. Reuse `sv`'s `dependsOn` behavior where practical instead of inventing incompatible dependency semantics.

## Configuration scopes

Configuration may eventually come from four scopes, from lowest to highest precedence:

1. Built-in defaults distributed with Leftium.
2. User defaults stored outside a project.
3. Project configuration and overrides under `.leftium/`.
4. Explicit CLI arguments.

v0 needs built-in defaults, project-local override files where an add-on requires them, and CLI arguments. A general user or project configuration system should wait for a concrete use case.

The expected locations are `~/.leftium/` for user configuration and `<project>/.leftium/` for project configuration. Mines are not another scope: mines make reusable material available, while scopes select and override it.

Keeping availability separate from selection prevents adding a mine from silently changing a project.

## Existing configuration

Before making changes, an add-on must classify relevant state as absent, already correct, incomplete but compatible, conflicting, or unsupported. It may create absent state, leave correct state alone, and safely extend incomplete state. It must not silently replace conflicting or ambiguous user-owned configuration.

Leftium should infer current state from the project's native files. It should not copy detected state into `.leftium/` merely to track it.

The project remains the source of truth. Leftium configuration should record desired policy only when that policy cannot be recovered from the native result.

## Overrides

Overrides express intentional project-specific exceptions. Prefer native override files when a domain already has a useful format. For example, a `gitattributes` override can contain ordinary `.gitattributes` lines.

Generated output should identify its source when the file format permits comments. Leftium-owned blocks are acceptable inside shared files only when their boundaries are unambiguous and unrelated content remains untouched.

## Idempotency

After a successful run, repeating the same command with the same inputs should produce no changes. If an upstream tool cannot guarantee this, the add-on must document and contain that limitation.
