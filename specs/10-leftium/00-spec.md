# Leftium project manager

**Date:** 2026-09-07
**Status:** Draft
**Package:** `leftium`
**Commands:** `leftium`, `le`
**Repository:** `Leftium/le` (proposed)

Leftium applies and maintains project conventions through one command, regardless of whether an add-on edits files, installs packages, calls another CLI, or configures a service.

Today those jobs are scattered across copied files, framework CLIs, package generators, shell scripts, and migration notes. A single interface means a user or agent does not need to remember which tool owns each convention. Unlike a starter kit, Leftium is intended to revisit existing projects and keep their configuration current.

## v0

v0 provides one command and three built-in add-ons:

```sh
le add license
le add gitattributes --preset nodiff
le add pages
```

For compatible Svelte projects, an unknown Leftium add-on is passed to `sv add`. This makes `le add` the common entry point without copying Svelte's add-on implementations.

v0 does not include mines, remote presets, a lockfile, desired-state project configuration, project scanning, or the `apply`, `check`, `outdated`, `update`, and `doctor` commands. These belong to the [roadmap](60-roadmap.md).

The three add-ons deliberately test different parts of one abstraction: `license` is simple file creation, `gitattributes` exercises native presets and merging, and `pages` exercises project detection and shared infrastructure. If one small add-on model handles all three, it is a useful base for later work.

## Design

```text
le add <addon>
  -> detect the project
  -> resolve the add-on and presets
  -> inspect existing state
  -> show or apply the required changes
  -> verify the result
```

An add-on describes a desired result, not an implementation technique. It may use direct transforms, an upstream installer, a generator, shared infrastructure, or another CLI. Leftium should prefer upstream domain models and native configuration formats over parallel abstractions.

Every v0 add-on must:

- preserve unrelated project configuration;
- detect conflicts before overwriting user-owned values;
- be idempotent where the underlying operation permits it;
- work non-interactively when all required choices are supplied;
- explain the changes it made or would make.

## Documents

- [Core model](10-core-model.md) defines add-ons, presets, composition, scopes, and overrides.
- [Implementation architecture](20-architecture.md) defines the v0 code shape and how Leftium reuses `sv`.
- [CLI](30-cli.md) defines command resolution, project detection, and `sv` delegation.
- [License](40-addons/10-license.md) specifies the `license` add-on.
- [Git attributes](40-addons/20-gitattributes.md) specifies the `gitattributes` add-on.
- [GitHub Pages](40-addons/30-pages.md) specifies the `pages` add-on.
- [Resolution and mines](50-resolution-and-mines.md) records the post-v0 extension model so v0 does not block it.
- [Roadmap](60-roadmap.md) collects deferred commands, add-ons, and unresolved design choices.
- [Influences](90-influences.md) records the projects and package-manager concepts behind the design.

The separate [GitHub Pages migration plan](../20-github-pages-migration/10-plan.md) predates Leftium. It remains an operational migration plan, but its projects should eventually use the `pages` add-on instead of maintaining copied setup instructions.

## Implementation order

1. Build the CLI shell, project detection, change reporting, and add-on interface.
2. Implement `license` to establish file creation and conflict handling.
3. Implement `gitattributes` to establish preset composition and managed-file updates.
4. Implement `pages` to establish package changes, Svelte configuration, and generated workflows.
5. Add `sv add` delegation for unknown add-ons in compatible Svelte projects.

Do not introduce mines, project configuration, or other roadmap machinery while implementing v0.

## Completion

v0 is complete when:

- both `leftium` and `le` invoke the same CLI;
- the three built-in add-ons satisfy their sub-specs;
- rerunning an add-on produces no unnecessary changes;
- conflicts stop with a useful explanation instead of silently overwriting user configuration;
- supported commands can run without prompts when their inputs are explicit;
- compatible unknown Svelte add-ons delegate to `sv add` transparently;
- unit tests cover resolution and preset composition, and fixture tests cover each built-in add-on.
