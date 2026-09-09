# Leftium project orchestrator - spec v2

**Date:** 2026-09-09
**Status:** Draft v2; license and gitattributes released, narrow creation published experimentally; supported creation and remaining v0 scope are in progress
**Package:** `leftium`
**Commands:** `leftium`, `le`
**Repository:** `Leftium/le`

Leftium creates projects through upstream creators, then applies and maintains conventions through the same add-on pipeline used for existing projects.

This repository contains the published CLI, implemented `license` and `gitattributes` add-ons, and a narrow Svelte creation implementation published experimentally as the creation architecture spike. The target has two entry points: `le create` establishes a starting project and records its creation recipe; `le add` adds or reconciles a capability. Generated projects use ordinary native configuration and should work without Leftium installed. See the [development README](../../README.md) for the currently runnable slice. `pages` and transparent delegation of unknown compatible Svelte add-ons remain required v0 work. Broader supported creation UX and environment coverage remain the next milestone.

This revision supersedes the add-only product framing in place. **Spec v2 is a document revision, not a CLI release number.** The first implementation milestone remains v0; Svelte creation follows immediately. Completion means both milestones below satisfy their observable acceptance criteria.

## Reading and source precedence

This directory is the active product spec. Start here, then read the core model, architecture, CLI, and the relevant operation sub-spec. The roadmap records deferred intent, not additional milestone requirements.

The [create addendum](../90-sources/20-create-addendum.md) supplies the newer product direction. The [conversation supplement](../90-sources/10-conversation-supplement.md) supplies recovered details, with user requests distinguished from assistant proposals. The [creation survey](../90-sources/30-creation-tools-survey.md) supplies research leads. These remain source documents; their repeated drafts and illustrative syntax do not override this integrated spec. The supplement links the partially recovered conversation and documents its limitations.

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

## Next milestone: Svelte creation

```sh
le create my-app --template sv:minimal --add license --add gitattributes
```

This is the intended command shape; complete option serialization is a design gate in the [creation spec](35-create.md). The milestone adds one `sv` creator backend, reuses add-ons, defers dependency installation where supported, and writes an expanded, versioned recreation command. Additional creators, aggregated catalogs, mine templates, and template updating remain later work.

## Design

```text
le add <addon>
  -> detect the project
  -> resolve the add-on and presets
  -> inspect existing state
  -> apply scoped edits or delegate to the upstream tool
  -> verify the result
```

An add-on describes a desired result, not an implementation technique. It may use direct transforms, an upstream installer, a generator, shared infrastructure, or another CLI. Leftium should prefer upstream domain models and native configuration formats over parallel abstractions.

Use `sv` as the default for behavior and implementation choices when its approach fits Leftium. Prefer its conventions and public capabilities over inventing alternatives. Depart where Leftium's broader project scope, explicit product requirements, or verified upstream limitations require it; document the reason at that boundary. This is a decision default, not a promise to mirror every upstream feature or release.

Content-specific reconciliation and optional version-control review keep the implementation small. Generated output is replaceable within declared boundaries; shared configuration uses targeted edits. See the [ownership and recovery policy](10-core-model.md#content-ownership-and-reconciliation).

Every v0 add-on must:

- preserve unrelated project configuration;
- detect conflicts before overwriting user-owned values;
- be idempotent where the underlying operation permits it;
- work non-interactively when all required choices are supplied;
- report its changes and any upstream or non-file effects, without promising a complete preview of every operation.

## Documents

- [Core model](10-core-model.md) defines add-ons, presets, composition, scopes, and overrides.
- [Implementation architecture](20-architecture.md) defines the v0 code shape and how Leftium reuses `sv`.
- [CLI](30-cli.md) defines command resolution, project detection, and `sv` delegation.
- [Creation](35-create.md) defines creators, orchestration, recipes, and the next milestone.
- [License](40-addons/10-license.md) specifies the `license` add-on.
- [Git attributes](40-addons/20-gitattributes.md) specifies the `gitattributes` add-on.
- [GitHub Pages](40-addons/30-pages.md) specifies the `pages` add-on.
- [Resolution and mines](50-resolution-and-mines.md) records the post-v0 extension model so v0 does not block it.
- [Roadmap](60-roadmap.md) collects deferred commands, add-ons, and unresolved design choices.
- [Logo](40-addons/40-logo.md) preserves the deferred generator and installation direction.
- [Influences](90-influences.md) records the projects and package-manager concepts behind the design.

The separate [GitHub Pages migration plan](../20-github-pages-migration/10-plan.md) predates Leftium. It remains an operational migration plan, but its projects should eventually use the `pages` add-on instead of maintaining copied setup instructions.

## Implementation order

1. Build the minimal TypeScript/ESM CLI shell with Commander and Clack, directory target context, change reporting, and a provisional add-on boundary. Keep orchestration independent of Commander and add dependencies as needed.
2. Implement `license` to establish file creation and conflict handling, including plain directories without Git or a package manifest. Use it to evaluate the [TypeScript shell and ReScript core](20-architecture.md#typescript-shell-and-rescript-core): assess glue volume, state modeling, testing, typed generated-JS imports, build/watch behavior, and debugging before generalizing the split. Keep more implementation in TypeScript where the cost outweighs the benefit.
3. Run a vertical creation spike: `sv:minimal`, Leftium `license`, official Prettier, one coordinated install, README recipe, and replay in a fresh destination. Use three representative round-trip cases to settle flags and provider boundaries before freezing the internal API. Evaluate request/recipe normalization as the second ReScript case and refine language boundaries from both experiments before the remaining add-ons harden them.
4. Implement `gitattributes`, first comparing native `-diff` with a custom driver in a disposable Git fixture, then establishing preset composition and regeneration.
5. Harden standalone `sv` delegation and execution-result handling using the spike's findings.
6. Implement the narrow SvelteKit Pages slice, define and release its reusable workflow, then validate one consumer adoption.
7. Stabilize creation UX and its supported environment matrix for the next release milestone.

This is engineering order, not release order. A narrow Svelte creation implementation is published experimentally and serves as the creation architecture spike. Broader supported creation UX and environment coverage remain the next milestone. v0 still requires the three add-ons and delegation. The spike may refine implementation details, but scope changes require an explicit decision. Do not introduce mines or desired-state configuration to implement either milestone.

## v0 completion

v0 is complete when:

- both `leftium` and `le` invoke the same CLI;
- the three built-in add-ons satisfy their sub-specs;
- rerunning an add-on produces no unnecessary changes;
- conflicts stop with a useful explanation instead of silently overwriting user configuration;
- supported commands can run without prompts when their inputs are explicit;
- compatible unknown Svelte add-ons delegate to `sv add` transparently;
- unit tests cover resolution and preset composition, and fixture tests cover each built-in add-on.

The next milestone is complete when the [creation acceptance criteria](35-create.md#acceptance) also pass.
