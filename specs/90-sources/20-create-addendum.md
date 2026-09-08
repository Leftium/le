# `le create` addendum

> Archived design input, integrated into [spec v2](../10-leftium/00-spec.md). The [integration map](../10-leftium/90-influences.md#integration-disposition) records adopted and deferred ideas. Historical proposals below do not override the active spec.

**Status:** Draft addendum

**Purpose:** Record the project-creation decisions made after the current Leftium spec was reorganized.

This document is intentionally cross-cutting. Its contents should eventually be merged into the main spec, especially:

- `00-spec.md`
- `10-core-model.md`
- `20-architecture.md`
- `30-cli.md`
- `50-resolution-and-mines.md`
- `60-roadmap.md`
- `90-influences.md`

Where this addendum conflicts with the current roadmap's project-preset direction or the current `sv` integration strategy, this addendum represents the newer design direction.

---

## 1. Broaden Leftium's role

Leftium should support project creation in addition to configuring and maintaining existing projects.

The short definition becomes:

> Leftium is a project creation, setup, and configuration orchestrator.

The core commands are:

```sh
le create
le add
```

Their responsibilities are distinct:

```text
le create
  create a coherent starting project
  +
  apply selected add-ons
  +
  record how the project was created

le add
  add or reconcile capabilities and conventions
  in a new or existing project
```

Supporting `create` does not turn Leftium into a conventional starter kit.

A major differentiator remains that the same add-ons used during creation can later be applied to existing projects and revisited for maintenance.

Leftium is therefore not limited to one-time scaffolding.

---

## 2. Creation should compose with `add`

`le create` should reuse the existing add-on model rather than develop a parallel configuration system.

Conceptually:

```text
le create
    ↓
select creator/template
    ↓
create base project
    ↓
apply add-ons
    ↓
install dependencies
    ↓
verify
    ↓
record recreation recipe
```

Example:

```sh
le create my-app \
  --template sv:minimal \
  --add prettier \
  --add eslint \
  --add license \
  --add gitattributes \
  --add pages
```

The same add-ons remain independently usable:

```sh
cd existing-project

le add license
le add gitattributes
le add pages
```

The `create` command should orchestrate `add`, not duplicate it.

---

## 3. Creator

A **creator** is the upstream or Leftium-owned mechanism that establishes the initial project structure.

Examples:

```text
sv
Electrobun/Hutch
Vite
Leftium file-backed templates
```

A creator may be:

- a public library API;
- an upstream CLI;
- an upstream template catalog;
- a Leftium-owned file/template implementation.

Leftium should prefer an authoritative upstream creator whenever one exists.

Examples:

```text
Svelte project
  → sv

Electrobun project
  → Electrobun/Hutch

Vite project
  → create-vite
```

Leftium should not copy upstream templates merely to make them available through `le create`.

---

## 4. Template

A **template** is a coherent starting project supplied by a creator.

Examples:

```text
sv:minimal
sv:demo

electrobun:solid
electrobun:hello-world
electrobun:multi-window

vite:vanilla-ts
```

Templates may range from minimal framework skeletons to substantial application patterns.

Do not require every template to be reducible to:

```text
minimal template + many add-ons
```

Some cohesive structures are naturally templates.

For example, a multi-window desktop application may reasonably be one template even if parts of its functionality could theoretically be modeled as add-ons.

The distinction is:

> Templates establish coherent starting structure.

> Add-ons provide capabilities or conventions that can safely be layered onto projects.

---

## 5. Template qualification

Templates from different creators may have overlapping names.

Qualified identifiers should therefore be supported when ambiguity exists.

Provisional syntax:

```text
<creator>:<template>
```

Examples:

```sh
le create app --template sv:minimal
le create app --template electrobun:solid
le create app --template vite:vanilla-ts
```

Short names may be accepted when resolution is unambiguous or when a default creator is configured.

The exact qualification syntax remains provisional, but resolution must never silently choose between ambiguous templates.

---

## 6. Template catalogs

`le create` should be able to present templates as a browsable catalog.

Interactive example:

```text
? Choose a template

Svelte
  minimal
  demo
  library

Electrobun
  hello-world
  svelte
  solid
  multi-window
  tray-app

Leftium
  ...
```

Electrobun/Hutch is an important influence here: its initializer exposes an interactive catalog containing both framework starters and richer application skeletons.

Leftium should reuse upstream catalogs where possible rather than mirror them.

Creator-specific concepts such as:

- channels;
- beta/stable catalogs;
- creator versions;
- template pins;

should remain owned by the upstream creator unless Leftium has a concrete reason to generalize them.

---

## 7. Recipe

A **recipe** is the complete reproducible description of how a project was created.

The primary human-readable representation of a recipe should be an executable `leftium create` command.

Example:

```sh
pnpm dlx leftium@0.3.1 create \
  --template sv:minimal \
  --types ts \
  --add prettier \
  --add eslint \
  --add license \
  --add gitattributes \
  --add pages \
  --install pnpm \
  my-app
```

This follows the model used by `sv create`, whose generated README records a promptless command that recreates the project with the same creation choices.

A recipe is different from a preset:

```text
preset
  reusable input/default

recipe
  resolved record of one creation
```

It is also different from future desired-state configuration:

```text
recipe
  how the project was originally created

desired state
  what Leftium should maintain now
```

The two concepts should not be conflated.

---

## 8. Generated projects should record their recipe

A project created by Leftium SHOULD record an explicit recreation command.

The preferred human-facing location is the generated project README.

Example:

````md
## Creating this project

To recreate this project with the same configuration:

```sh
pnpm dlx leftium@0.3.1 create ...
```
````

The recorded command SHOULD:

- be non-interactive;
- include the project template;
- include the selected add-ons;
- include choices needed by those add-ons;
- include the package manager where relevant;
- pin the Leftium version;
- preserve creator/template version information where necessary and available.

The purpose is for a human or agent to be able to copy the command and reproduce the same starting project without reconstructing the original prompts.

Exact reproducibility is limited by upstream creators. Leftium should capture enough resolved version information to reproduce the project as closely as the creator permits.

The exact mechanism used to insert or preserve the recipe in an existing upstream README is unresolved.

---

## 9. Defaults expand into recipes

User-level defaults may make creation very short.

Example:

```sh
le create my-app
```

might resolve through `~/.leftium/` to something equivalent to:

```text
creator/template:
  sv:minimal

language:
  TypeScript

package manager:
  pnpm

add-ons:
  prettier
  eslint
  license
  gitattributes
  pages
  logo
```

However, the generated project's recipe SHOULD record the resolved choices rather than merely:

```sh
le create my-app
```

because the user's defaults may later change.

Therefore:

```text
defaults
  convenient input

resolved recipe
  reproducible output
```

This is similar in spirit to the difference between a loose dependency declaration and a resolved lockfile, although a recipe is not itself a lockfile.

---

## 10. Reconsider project presets

The current roadmap proposes a project preset that composes several configured add-ons.

`le create` reduces the need for a separate project-preset schema.

A creation recipe already composes:

```text
creator
+
template
+
creator options
+
add-ons
+
add-on options/presets
+
package manager
```

Therefore, a YAML/JSON project-preset format should NOT be introduced merely to serialize project creation.

A named project preset may still be useful later as a convenience alias.

For example:

```sh
le create foo --preset leftium-kit
```

could expand to a set of defaults.

But the resulting project SHOULD record the expanded recipe rather than only:

```sh
le create foo --preset leftium-kit
```

This preserves reproducibility if `leftium-kit` later changes.

Named project presets are therefore best understood as:

> convenient reusable inputs or macros for creating a recipe.

They are not the canonical record of the created project.

The existing concept of composite add-on presets remains useful and is unaffected.

---

## 11. Svelte should become a first-class creation backend

The addition of `le create` changes the preferred level of `sv` integration.

The current spec favors spawning `sv` for transparent `add` passthrough and importing public APIs only when a Leftium add-on intentionally composes with `sv`.

That remains correct for unknown/community `sv add` passthrough.

However, for Svelte project creation, Leftium should prefer `sv`'s public programmatic APIs.

`sv` publicly exposes both:

```text
create()
add()
```

This allows Leftium to orchestrate one coherent creation flow rather than nesting a second interactive CLI.

Preferred model:

```text
Svelte creation
  → sv public create API

official Svelte add-ons during creation
  → sv public add API where practical

sv-utils
  → shared Svelte/project transforms where useful

unknown/community sv add-on
  → delegate to real sv CLI/resolver when necessary
```

Do not fork or copy `sv` implementation code when its public API is sufficient.

---

## 12. Revised `sv` integration rule

The existing spawn-vs-import rule should become:

```text
Svelte project creation
  → public sv API

intentional composition with official sv functionality
  → public sv API / sv-utils

transparent unknown/community add-on passthrough
  → real sv CLI/resolver
```

This preserves upstream ownership while allowing `le create` to control:

- one interaction;
- one plan;
- one dependency-install phase;
- one report;
- one recorded recipe.

Leftium should continue depending on a known compatible `sv` version for imported APIs.

---

## 13. Plan before mutation

`le create` SHOULD resolve the complete creation plan before significant mutation whenever practical.

Conceptually:

```text
resolve creator/template
        ↓
resolve creator options
        ↓
resolve add-ons
        ↓
resolve add-on options/presets
        ↓
resolve dependencies
        ↓
show/finalize plan
        ↓
create project
        ↓
apply add-ons
        ↓
install
        ↓
verify
        ↓
emit recipe
```

Benefits include:

- fewer partially-created projects;
- better non-interactive behavior;
- better dry-run support later;
- easier agent use;
- fewer repeated dependency installs.

---

## 14. Prefer one dependency installation

Creators and add-ons often install dependencies independently.

`le create` SHOULD avoid repeated installation when upstream tools expose a supported way to defer it.

Preferred flow:

```text
create without final install
        ↓
apply all planned add-ons
        ↓
resolve final dependency set
        ↓
install once
```

Examples of useful upstream behavior include creators that provide `--skip-install` or APIs that generate files before installation.

This is a preference, not an absolute requirement.

Some upstream creators may require installation or other setup during creation. Leftium should preserve those workflows rather than reimplement them unsafely.

---

## 15. Mines may provide templates

The mine model should expand from:

```text
mine provides:
  add-ons
  presets
```

to:

```text
mine provides:
  add-ons
  presets
  templates
```

A mine may eventually provide file-backed Leftium templates or reusable template definitions.

Example:

```text
mine/
  .leftium/
    addons/
    presets/
    templates/
      userscript/
      static-site/
```

Adding a mine still changes only availability.

It MUST NOT create a project or change template defaults merely because the mine was added.

Template resolution should follow the same general principles as add-on/preset resolution:

- explicit qualification wins;
- ambiguity is an error;
- provenance should be preserved;
- remote inputs eventually require reproducible version resolution.

Mine-backed templates are post-v0 unless implementation priorities are explicitly changed.

---

## 16. Upstream template catalogs vs mine templates

Mines should not become copies of upstream catalogs.

For example:

```text
Electrobun catalog
  → owned/resolved by Electrobun/Hutch

Svelte templates
  → owned by sv

Vite templates
  → owned by Vite

Leftium/mine templates
  → used where Leftium or the mine actually owns the template
```

The creator abstraction should allow Leftium to aggregate these sources into one user-facing selection experience without transferring ownership of their definitions.

---

## 17. Interactive and non-interactive creation

Interactive use should optimize discovery.

Example:

```sh
le create
```

may ask for:

- project name/directory;
- creator/template;
- creator-specific options;
- add-ons;
- add-on-specific choices;
- package manager.

Non-interactive use must be able to represent the same choices.

Example:

```sh
le create my-app \
  --template sv:minimal \
  --types ts \
  --add prettier \
  --add eslint
```

A project recipe must always use the non-interactive representation.

The exact CLI syntax for serializing add-on-specific options inside `le create` is unresolved.

Do NOT introduce an awkward miniature command language inside `--add` merely to solve this prematurely.

The final syntax must be:

- deterministic;
- shell-friendly;
- human-readable;
- capable of representing all required creation choices.

---

## 18. Relationship between creation and ongoing maintenance

Creation and maintenance share add-ons but have different historical roles.

```text
create recipe
  records original creation

native project files
  record current actual state

future desired-state config
  may record policy Leftium should continue maintaining
```

Running later commands such as:

```sh
le add foo
```

does not necessarily imply rewriting the original creation recipe.

Whether Leftium should maintain a separate current-state/desired-state record is still governed by the existing rule:

> Do not duplicate state that can be inferred from native project files.

A future desired-state system should be designed from concrete maintenance requirements, not from the existence of `le create`.

---

## 19. Influence: `sv create`

`sv create` is now a direct influence alongside `sv add`.

Important patterns to preserve:

- creation and add-ons can be composed in one invocation;
- the generated project records a promptless recreation command;
- the same framework tool exposes public APIs for creation and add-ons;
- upstream template ownership stays with `sv`.

Leftium generalizes this model beyond Svelte:

```text
sv
  create Svelte project
  + add Svelte capabilities
  + record creation recipe

Leftium
  create project through appropriate creator
  + add cross-project capabilities
  + record creation recipe
```

---

## 20. Influence: Electrobun/Hutch

Electrobun/Hutch contributes a complementary model:

- a browsable template catalog;
- templates ranging from minimal examples to substantial application patterns;
- direct non-interactive template selection;
- upstream-owned stable/beta channels;
- creator-controlled template/release pinning;
- an option to defer installation.

Leftium should adopt the general lessons without cloning Electrobun-specific concepts into its generic model.

In particular:

> Let each creator own the semantics unique to its ecosystem.

---

## 21. Revised conceptual architecture

```text
                         leftium
                            │
               ┌────────────┴────────────┐
               │                         │
          le create                   le add
               │                         │
       resolve creator                   │
               │                         │
       resolve template                  │
               │                         │
       create base project               │
               │                         │
               └──────────┬──────────────┘
                          │
                    resolve add-ons
                          │
                    plan/reconcile
                          │
                      apply
                          │
                       verify
```

Possible creator backends:

```text
             creator resolver
                    │
      ┌─────────────┼──────────────┐
      │             │              │
      sv        Electrobun        Vite
      │             │              │
      └──────── created project ────┘
                    │
                    ▼
                 add-ons
```

The add-on system remains the shared configuration engine.

---

## 22. Suggested implementation priority

`le create` should be considered a core product direction, but it does not need to interrupt the existing three-add-on v0 unless deliberately reprioritized.

Recommended sequence:

```text
v0
  le add
  license
  gitattributes
  pages
  sv add passthrough

high-priority next step
  le create
  sv creator backend
  recipe generation

later
  additional creators
  aggregated template catalogs
  mine-backed templates
```

Starting with the `sv` backend provides the best test because:

- most Leftium projects are SvelteKit;
- `sv` already exposes public `create` and `add` APIs;
- `sv` already demonstrates recipe generation;
- the existing Leftium architecture is intentionally `sv`-like.

Other creator backends should be added only after the abstraction is demonstrated with `sv`.

---

## 23. Decisions recorded by this addendum

The following are the intended new directions:

1. Add `le create` as the project-creation counterpart to `le add`.
2. Broaden Leftium from setup/configuration orchestration to creation + setup + configuration orchestration.
3. Reuse the existing add-on pipeline during creation.
4. Define **creator**, **template**, and **recipe** as distinct concepts.
5. Treat an executable, versioned `le create` command as the primary human-readable project recipe.
6. Record the resolved recreation recipe in generated projects, preferably in the README.
7. Expand user defaults or named presets into the recorded recipe instead of recording only the shorthand.
8. De-emphasize a separate YAML/JSON project-preset schema for project creation.
9. Retain named project presets only as possible convenience aliases/macros.
10. Prefer `sv`'s public `create`/`add` APIs for Svelte creation and intentional official integration.
11. Continue CLI delegation for transparent unknown/community `sv` add-ons where that preserves upstream behavior.
12. Prefer resolving the complete creation plan before mutation.
13. Prefer one final dependency install when upstream creators allow installation to be deferred.
14. Allow mines to supply Leftium-owned templates in addition to add-ons and presets.
15. Aggregate upstream template catalogs without copying ownership of them into Leftium.
16. Use qualified template names when necessary to avoid ambiguity.
17. Keep creation recipes separate from future desired-state maintenance configuration.

---

## 24. Open decisions

The following are intentionally unresolved:

- Exact `le create` CLI syntax.
- Exact creator/template qualification syntax.
- Serialization of per-add-on options inside a non-interactive creation recipe.
- Whether `le create` enters v0 or immediately follows it.
- How the recipe is inserted into or merged with an upstream-generated README.
- Whether recipes eventually get a structured machine-readable representation in addition to the executable command.
- How creator-specific version/channel information is represented in recipes.
- Whether later `le add` operations should ever update a creation recipe.
- The public API for third-party creator integrations.
- Exact mine layout/metadata for templates.
- Which creators besides `sv` should be supported first.

These questions should be resolved from implementation experience rather than by building a generalized creator framework in advance.
